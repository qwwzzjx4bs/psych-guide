"""
J-STAGE OpenAPI フェッチャー（国内誌）

J-STAGE API（無料・認証不要）から精神医学関連の国内論文を取得する。
https://www.jstage.jst.go.jp/static/files/ja/help_jstage_data_03.pdf
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Optional
from xml.etree import ElementTree as ET

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import Paper, FetchLog

logger = logging.getLogger(__name__)

JSTAGE_API = "https://api.jstage.jst.go.jp/searchapi/do"

# J-STAGE で検索する精神医学キーワード
JSTAGE_KEYWORDS = [
    "精神医学",
    "統合失調症",
    "うつ病",
    "双極性障害",
    "不安障害",
    "psychiatry",
    "schizophrenia",
]

# 代表的な精神医学系ジャーナルの ISSN（J-STAGE 登録誌）
JSTAGE_JOURNALS = [
    "0021-5199",  # 精神神経学雑誌
    "1340-2420",  # 臨床精神薬理
    "0910-1187",  # 精神科治療学
]


class JstageFetcher:
    """J-STAGE OpenAPI から国内精神医学論文を取得するフェッチャー"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_recent(self, days: int = 30) -> dict:
        stats = {"total": 0, "new": 0}
        today = datetime.utcnow()
        from_date = today - timedelta(days=days)

        async with httpx.AsyncClient(timeout=30.0) as client:
            # キーワード検索
            for keyword in JSTAGE_KEYWORDS[:4]:  # API負荷低減のため代表4キーワード
                try:
                    s = await self._search_keyword(client, keyword, from_date)
                    stats["total"] += s["total"]
                    stats["new"]   += s["new"]
                    logger.info(f"J-STAGE [{keyword}]: {s['total']} fetched, {s['new']} new")
                except Exception as e:
                    logger.error(f"J-STAGE [{keyword}] error: {e}")
        return stats

    async def _search_keyword(
        self, client: httpx.AsyncClient, keyword: str, from_date: datetime
    ) -> dict:
        params = {
            "service": "3",           # 論文検索
            "text": keyword,
            "sortorder": "1",         # 降順（新しい順）
            "count": "50",
            "startrow": "1",
            "lang": "0",              # 0=all, 1=ja, 2=en
        }
        resp = await client.get(JSTAGE_API, params=params)
        resp.raise_for_status()

        root = ET.fromstring(resp.text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall("atom:entry", ns)

        new_count = 0
        for entry in entries:
            added = await self._upsert_entry(entry, ns, from_date)
            if added:
                new_count += 1

        await self.db.commit()
        return {"total": len(entries), "new": new_count}

    def _get_text(self, el, tag: str, ns: dict) -> str:
        node = el.find(tag, ns)
        return (node.text or "").strip() if node is not None else ""

    async def _upsert_entry(self, entry, ns: dict, from_date: datetime) -> bool:
        # 記事IDとして DOI または J-STAGE URL を使用
        source_id = self._get_text(entry, "atom:id", ns)
        if not source_id:
            return False

        existing = await self.db.scalar(
            select(Paper).where(Paper.source == "jstage", Paper.source_id == source_id)
        )
        if existing:
            return False

        # 発行日チェック
        pub_date_raw = self._get_text(entry, "atom:updated", ns) or self._get_text(entry, "atom:published", ns)
        pub_year: Optional[int] = None
        pub_date_str = ""
        if pub_date_raw:
            try:
                dt = datetime.fromisoformat(pub_date_raw[:10])
                if dt < from_date:
                    return False
                pub_date_str = dt.strftime("%Y-%m-%d")
                pub_year = dt.year
            except ValueError:
                pub_date_str = pub_date_raw[:10]
                try:
                    pub_year = int(pub_date_str[:4])
                except ValueError:
                    pass

        title = self._get_text(entry, "atom:title", ns)
        summary = self._get_text(entry, "atom:summary", ns)
        link_el = entry.find("atom:link[@rel='alternate']", ns)
        url = link_el.get("href") if link_el is not None else ""

        # DOI 抽出
        doi: Optional[str] = None
        if url and "doi.org" in url:
            doi = url.split("doi.org/")[-1].strip()

        # Journal from category or source
        journal = ""
        src_el = entry.find("atom:source", ns)
        if src_el is not None:
            journal_title = src_el.find("atom:title", ns)
            if journal_title is not None:
                journal = (journal_title.text or "").strip()

        paper = Paper(
            source="jstage",
            source_id=source_id,
            title=title,
            abstract=summary or None,
            journal=journal or "J-STAGE",
            pub_date=pub_date_str,
            pub_year=pub_year,
            url=url,
            doi=doi,
            language="ja",
        )
        self.db.add(paper)
        return True

    async def log_result(self, stats: dict, error: Optional[str] = None):
        log = FetchLog(
            source="jstage",
            status="success" if not error else "error",
            items_fetched=stats.get("total", 0),
            items_new=stats.get("new", 0),
            error_message=error,
            finished_at=datetime.utcnow(),
        )
        self.db.add(log)
        await self.db.commit()
