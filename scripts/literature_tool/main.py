"""
精神医学論文ツール — FastAPI バックエンド

Phase 2: 複数ソース統合・REST API・定期クロール・メール通知・AI要約
"""
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import or_, and_, select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db, init_db
from models import Paper, Alert, FetchLog
from scheduler import setup_scheduler, run_pubmed_fetch, run_rss_fetch, run_medrxiv_fetch, run_jstage_fetch, run_guidelines_fetch, run_alert_notifications_job

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# =========================================================
# Lifespan: DB 初期化 + スケジューラ起動
# =========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    await init_db()
    scheduler = setup_scheduler()
    scheduler.start()
    logger.info(f"Scheduler started. Jobs: {[j.id for j in scheduler.get_jobs()]}")
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped.")


# =========================================================
# App
# =========================================================
app = FastAPI(
    title="精神医学論文ツール API",
    description="PubMed・RSS・medRxiv・J-STAGEから精神医学論文を収集し提供するAPI",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"] if not settings.is_production else settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Pydantic Schemas
# =========================================================
class PaperOut(BaseModel):
    id: int
    source: str
    source_id: str
    title: str
    abstract: Optional[str] = None
    authors: Optional[List[str]] = None
    journal: Optional[str] = None
    pub_date: Optional[str] = None
    pub_year: Optional[int] = None
    url: Optional[str] = None
    doi: Optional[str] = None
    pmc_id: Optional[str] = None
    article_types: Optional[List[str]] = None
    is_open_access: bool = False
    summary_ja: Optional[str] = None
    fetched_at: datetime

    model_config = {"from_attributes": True}


class PaperListOut(BaseModel):
    total: int
    offset: int
    limit: int
    items: List[PaperOut]


class AlertCreate(BaseModel):
    email: EmailStr
    keyword: str
    sources: str = "pubmed,medrxiv,jstage"


class AlertOut(BaseModel):
    id: int
    email: str
    keyword: str
    sources: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class FetchLogOut(BaseModel):
    id: int
    source: str
    status: str
    items_fetched: int
    items_new: int
    error_message: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SummaryRequest(BaseModel):
    paper_id: int


# =========================================================
# Helper: Paper -> PaperOut
# =========================================================
def paper_to_out(p: Paper) -> PaperOut:
    return PaperOut(
        id=p.id,
        source=p.source,
        source_id=p.source_id,
        title=p.title,
        abstract=p.abstract,
        authors=json.loads(p.authors) if p.authors else None,
        journal=p.journal,
        pub_date=p.pub_date,
        pub_year=p.pub_year,
        url=p.url,
        doi=p.doi,
        pmc_id=p.pmc_id,
        article_types=json.loads(p.article_types) if p.article_types else None,
        is_open_access=p.is_open_access,
        summary_ja=p.summary_ja,
        fetched_at=p.fetched_at,
    )


# =========================================================
# Health Check
# =========================================================
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# =========================================================
# Papers — GET /api/papers
# =========================================================
@app.get("/api/papers", response_model=PaperListOut, tags=["papers"])
async def list_papers(
    source: Optional[str] = Query(None, description="ソース絞り込み: pubmed|rss|medrxiv|jstage|guideline"),
    year_from: Optional[int] = Query(None, description="発行年 From"),
    year_to: Optional[int]   = Query(None, description="発行年 To"),
    article_type: Optional[str] = Query(None, description="論文種別キーワード: RCT, Meta-Analysis, Review など"),
    open_access: Optional[bool] = Query(None, description="オープンアクセスのみ"),
    offset: int  = Query(0, ge=0),
    limit: int   = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    if source:
        conditions.append(Paper.source == source)
    if year_from:
        conditions.append(Paper.pub_year >= year_from)
    if year_to:
        conditions.append(Paper.pub_year <= year_to)
    if article_type:
        conditions.append(Paper.article_types.ilike(f"%{article_type}%"))
    if open_access is not None:
        conditions.append(Paper.is_open_access == open_access)

    base_q = select(Paper)
    if conditions:
        base_q = base_q.where(and_(*conditions))

    total = await db.scalar(
        select(func.count()).select_from(base_q.subquery())
    )
    papers = (await db.execute(
        base_q.order_by(desc(Paper.pub_year), desc(Paper.fetched_at))
              .offset(offset).limit(limit)
    )).scalars().all()

    return PaperListOut(
        total=total or 0,
        offset=offset,
        limit=limit,
        items=[paper_to_out(p) for p in papers],
    )


# =========================================================
# Papers — GET /api/papers/{id}
# =========================================================
@app.get("/api/papers/{paper_id}", response_model=PaperOut, tags=["papers"])
async def get_paper(paper_id: int, db: AsyncSession = Depends(get_db)):
    paper = await db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="論文が見つかりません")
    return paper_to_out(paper)


# =========================================================
# Search — GET /api/search
# =========================================================
@app.get("/api/search", response_model=PaperListOut, tags=["papers"])
async def search_papers(
    q: str = Query(..., min_length=1, description="検索キーワード"),
    source: Optional[str] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int]   = Query(None),
    offset: int = Query(0, ge=0),
    limit: int  = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    keyword = f"%{q}%"
    text_cond = or_(
        Paper.title.ilike(keyword),
        Paper.abstract.ilike(keyword),
        Paper.authors.ilike(keyword),
        Paper.journal.ilike(keyword),
        Paper.keywords.ilike(keyword),
    )
    conditions = [text_cond]
    if source:
        conditions.append(Paper.source == source)
    if year_from:
        conditions.append(Paper.pub_year >= year_from)
    if year_to:
        conditions.append(Paper.pub_year <= year_to)

    base_q = select(Paper).where(and_(*conditions))
    total = await db.scalar(select(func.count()).select_from(base_q.subquery()))
    papers = (await db.execute(
        base_q.order_by(desc(Paper.pub_year), desc(Paper.fetched_at))
              .offset(offset).limit(limit)
    )).scalars().all()

    return PaperListOut(
        total=total or 0,
        offset=offset,
        limit=limit,
        items=[paper_to_out(p) for p in papers],
    )


# =========================================================
# Alerts — POST /api/alerts
# =========================================================
@app.post("/api/alerts", response_model=AlertOut, status_code=201, tags=["alerts"])
async def create_alert(payload: AlertCreate, db: AsyncSession = Depends(get_db)):
    # 同一メール × キーワードの重複チェック
    existing = await db.scalar(
        select(Alert).where(Alert.email == payload.email, Alert.keyword == payload.keyword)
    )
    if existing:
        raise HTTPException(status_code=409, detail="同じキーワードのアラートが既に登録されています")

    alert = Alert(
        email=payload.email,
        keyword=payload.keyword,
        sources=payload.sources,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


# =========================================================
# Alerts — GET /api/alerts
# =========================================================
@app.get("/api/alerts", response_model=List[AlertOut], tags=["alerts"])
async def list_alerts(
    email: str = Query(..., description="登録メールアドレス"),
    db: AsyncSession = Depends(get_db),
):
    alerts = (await db.execute(
        select(Alert).where(Alert.email == email, Alert.is_active == True)
    )).scalars().all()
    return list(alerts)


# =========================================================
# Alerts — DELETE /api/alerts/{id}
# =========================================================
@app.delete("/api/alerts/{alert_id}", status_code=204, tags=["alerts"])
async def delete_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="アラートが見つかりません")
    alert.is_active = False
    await db.commit()


# =========================================================
# AI Summary — POST /api/papers/{id}/summarize (Phase 3)
# =========================================================
@app.post("/api/papers/{paper_id}/summarize", tags=["ai"])
async def summarize_paper(
    paper_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI APIキーが設定されていません")

    paper = await db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="論文が見つかりません")
    if not paper.abstract:
        raise HTTPException(status_code=400, detail="抄録がありません")
    if paper.summary_ja:
        return {"summary_ja": paper.summary_ja, "cached": True}

    background_tasks.add_task(_generate_summary, paper_id)
    return {"message": "要約生成をバックグラウンドで開始しました", "paper_id": paper_id}


async def _generate_summary(paper_id: int):
    """OpenAI APIを使って英語抄録を日本語に要約（バックグラウンドタスク）"""
    from openai import AsyncOpenAI
    from database import AsyncSessionLocal
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    async with AsyncSessionLocal() as db:
        paper = await db.get(Paper, paper_id)
        if not paper or not paper.abstract:
            return

        prompt = (
            "以下は医学論文の英語の抄録です。精神科医・医療従事者向けに、"
            "300字程度の日本語要約を作成してください。"
            "PICO（対象・介入・比較・アウトカム）を意識し、主要な知見と臨床的意義を簡潔にまとめてください。\n\n"
            f"タイトル: {paper.title}\n\n"
            f"抄録:\n{paper.abstract}"
        )

        try:
            resp = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.3,
            )
            summary = resp.choices[0].message.content or ""
            paper.summary_ja = summary
            paper.summary_generated_at = datetime.utcnow()
            await db.commit()
            logger.info(f"Summary generated for paper {paper_id}")
        except Exception as e:
            logger.error(f"Summary generation failed for paper {paper_id}: {e}")


# =========================================================
# Manual trigger — POST /api/fetch/{source}
# =========================================================
@app.post("/api/fetch/{source}", tags=["admin"])
async def trigger_fetch(source: str, background_tasks: BackgroundTasks):
    """手動でクロールを実行（管理用）"""
    jobs = {
        "pubmed":     run_pubmed_fetch,
        "rss":        run_rss_fetch,
        "medrxiv":    run_medrxiv_fetch,
        "jstage":     run_jstage_fetch,
        "guidelines": run_guidelines_fetch,
        "alerts":     run_alert_notifications_job,
    }
    if source not in jobs:
        raise HTTPException(status_code=404, detail=f"ソース '{source}' は存在しません。有効値: {list(jobs.keys())}")
    background_tasks.add_task(jobs[source])
    return {"message": f"{source} のクロールをバックグラウンドで開始しました"}


# =========================================================
# Stats — GET /api/stats
# =========================================================
@app.get("/api/stats", tags=["system"])
async def get_stats(db: AsyncSession = Depends(get_db)):
    """保存済み論文のサマリー統計"""
    total = await db.scalar(select(func.count(Paper.id)))

    source_counts = (await db.execute(
        select(Paper.source, func.count(Paper.id).label("count"))
        .group_by(Paper.source)
    )).all()

    last_logs = (await db.execute(
        select(FetchLog).order_by(desc(FetchLog.started_at)).limit(10)
    )).scalars().all()

    return {
        "total_papers": total,
        "by_source": {row.source: row.count for row in source_counts},
        "recent_fetch_logs": [
            {
                "source": l.source,
                "status": l.status,
                "items_new": l.items_new,
                "started_at": l.started_at.isoformat() if l.started_at else None,
            }
            for l in last_logs
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=not settings.is_production)
