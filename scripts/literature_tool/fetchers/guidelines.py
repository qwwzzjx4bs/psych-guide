"""
学会ガイドライン更新監視フェッチャー

主要学会のRSSフィードやサイト更新を監視し、ガイドライン改訂情報をDBに保存する。
"""
import json
import logging
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Optional

import feedparser
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import Paper, FetchLog

logger = logging.getLogger(__name__)

# 学会・ガイドライン情報ソース
GUIDELINE_SOURCES = [
    # APA Practice Guidelines
    {
        "url": "https://www.psychiatry.org/rss/practice-guidelines",
        "org": "APA",
        "label": "APA Practice Guidelines",
    },
    # NICE Mental Health
    {
        "url": "https://feeds.nice.org.uk/updates/mental-health",
        "org": "NICE",
        "label": "NICE Mental Health Guidance",
    },
    # World Psychiatry (WPA journal)
    {
        "url": "https://onlinelibrary.wiley.com/action/showFeed?jc=2051-5545&type=etoc&feed=rss",
        "org": "WPA",
        "label": "World Psychiatry",
    },
    # Cochrane Reviews - Mental Health
    {
        "url": "https://www.cochranelibrary.com/cdsr/reviews/topics/87/rss.xml",
        "org": "Cochrane",
        "label": "Cochrane Mental Health Reviews",
    },
]


class GuidelineFetcher:
    """ガイドライン・レビュー更新監視フェッチャー"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_all(self) -> dict:
        stats = {"total": 0, "new": 0}
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            for src in GUIDELINE_SOURCES:
                try:
                    s = await self._fetch_source(client, src)
                    stats["total"] += s["total"]
                    stats["new"]   += s["new"]
                    logger.info(f"Guideline [{src['label']}]: {s['total']} fetched, {s['new']} new")
                except Exception as e:
                    logger.error(f"Guideline [{src['label']}] error: {e}")
        return stats

    async def _fetch_source(self, client: httpx.AsyncClient, src: dict) -> dict:
        resp = await client.get(src["url"])
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)

        new_count = 0
        for entry in feed.entries:
            added = await self._upsert_entry(entry, src)
            if added:
                new_count += 1

        await self.db.commit()
        return {"total": len(feed.entries), "new": new_count}

    async def _upsert_entry(self, entry, src: dict) -> bool:
        source_id = entry.get("id") or entry.get("link") or ""
        if not source_id:
            return False

        existing = await self.db.scalar(
            select(Paper).where(Paper.source == "guideline", Paper.source_id == source_id)
        )
        if existing:
            return False

        # Parse date
        pub_date_str = ""
        pub_year: Optional[int] = None
        published = entry.get("published") or entry.get("updated") or ""
        if published:
            try:
                dt = parsedate_to_datetime(published)
                pub_date_str = dt.strftime("%Y-%m-%d")
                pub_year = dt.year
            except Exception:
                pub_date_str = published[:10]
                try:
                    pub_year = int(pub_date_str[:4])
                except ValueError:
                    pass

        authors = []
        if entry.get("author"):
            authors = [entry.author]
        elif entry.get("authors"):
            authors = [a.get("name", "") for a in entry.authors]

        doi: Optional[str] = None
        link = entry.get("link", "")
        if "doi.org" in link:
            doi = link.split("doi.org/")[-1].strip()

        paper = Paper(
            source="guideline",
            source_id=source_id,
            title=entry.get("title", ""),
            abstract=entry.get("summary", "") or None,
            authors=json.dumps(authors, ensure_ascii=False),
            journal=f"{src['org']} — {src['label']}",
            pub_date=pub_date_str,
            pub_year=pub_year,
            url=link,
            doi=doi,
            article_types=json.dumps(["Guideline"], ensure_ascii=False),
        )
        self.db.add(paper)
        return True

    async def log_result(self, stats: dict, error: Optional[str] = None):
        log = FetchLog(
            source="guideline",
            status="success" if not error else "error",
            items_fetched=stats.get("total", 0),
            items_new=stats.get("new", 0),
            error_message=error,
            finished_at=datetime.utcnow(),
        )
        self.db.add(log)
        await self.db.commit()
