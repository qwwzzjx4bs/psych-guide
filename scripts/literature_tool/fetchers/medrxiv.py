"""
medRxiv / bioRxiv プレプリントフェッチャー

Cold Spring Harbor Lab の API（無料・認証不要）を使用する。
https://api.biorxiv.org/details/medrxiv/YYYY-MM-DD/YYYY-MM-DD/cursor/json
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import Paper, FetchLog

logger = logging.getLogger(__name__)

MEDRXIV_API = "https://api.biorxiv.org/details"

# 精神医学関連カテゴリ
PSYCH_CATEGORIES = [
    "psychiatry and clinical psychology",
    "neurology",
]


class MedRxivFetcher:
    """medRxiv・bioRxiv プレプリント取得フェッチャー"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_recent(self, days: int = 14) -> dict:
        stats = {"total": 0, "new": 0}
        today = datetime.utcnow()
        from_date = today - timedelta(days=days)
        date_from = from_date.strftime("%Y-%m-%d")
        date_to   = today.strftime("%Y-%m-%d")

        async with httpx.AsyncClient(timeout=30.0) as client:
            for server in ("medrxiv", "biorxiv"):
                try:
                    s = await self._fetch_server(client, server, date_from, date_to)
                    stats["total"] += s["total"]
                    stats["new"]   += s["new"]
                    logger.info(f"{server}: {s['total']} fetched, {s['new']} new")
                except Exception as e:
                    logger.error(f"{server} error: {e}")
        return stats

    async def _fetch_server(
        self, client: httpx.AsyncClient, server: str, date_from: str, date_to: str
    ) -> dict:
        cursor = 0
        total_new = 0
        total_fetched = 0

        while True:
            url = f"{MEDRXIV_API}/{server}/{date_from}/{date_to}/{cursor}/json"
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

            collection = data.get("collection", [])
            if not collection:
                break

            for item in collection:
                # 精神医学関連カテゴリのみ保存
                category = (item.get("category") or "").lower()
                if not any(c in category for c in PSYCH_CATEGORIES):
                    continue
                added = await self._upsert_item(item, server)
                if added:
                    total_new += 1
                total_fetched += 1

            await self.db.commit()

            # API は 100件単位で返す
            if len(collection) < 100:
                break
            cursor += 100

        return {"total": total_fetched, "new": total_new}

    async def _upsert_item(self, item: dict, server: str) -> bool:
        doi = item.get("doi", "")
        if not doi:
            return False

        source = "medrxiv" if server == "medrxiv" else "biorxiv"
        existing = await self.db.scalar(
            select(Paper).where(Paper.source == source, Paper.source_id == doi)
        )
        if existing:
            return False

        pub_date_str = item.get("date", "")
        pub_year: Optional[int] = None
        try:
            pub_year = int(pub_date_str[:4])
        except (ValueError, TypeError):
            pass

        authors_raw = item.get("authors", "")
        authors = [a.strip() for a in authors_raw.split(";") if a.strip()]

        paper = Paper(
            source=source,
            source_id=doi,
            title=item.get("title", ""),
            abstract=item.get("abstract", "") or None,
            authors=json.dumps(authors, ensure_ascii=False),
            journal=f"{server.capitalize()} [{item.get('category', '')}]",
            pub_date=pub_date_str,
            pub_year=pub_year,
            url=f"https://www.medrxiv.org/content/{doi}v{item.get('version', 1)}",
            doi=doi,
            article_types=json.dumps(["Preprint"], ensure_ascii=False),
        )
        self.db.add(paper)
        return True

    async def log_result(self, stats: dict, error: Optional[str] = None):
        log = FetchLog(
            source="medrxiv",
            status="success" if not error else "error",
            items_fetched=stats.get("total", 0),
            items_new=stats.get("new", 0),
            error_message=error,
            finished_at=datetime.utcnow(),
        )
        self.db.add(log)
        await self.db.commit()
