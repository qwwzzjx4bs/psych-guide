"""
主要精神医学ジャーナルの RSS フィードフェッチャー

feedparser を使ってジャーナルの新着記事をRSSから取得する。
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

# 主要精神医学ジャーナルのRSSフィード一覧
RSS_FEEDS = [
    {
        "url": "https://jamanetwork.com/rss/site_3/67.xml",
        "journal": "JAMA Psychiatry",
        "source_prefix": "jama_psych",
    },
    {
        "url": "https://www.thelancet.com/rssfeed/lanpsy_current.xml",
        "journal": "Lancet Psychiatry",
        "source_prefix": "lancet_psych",
    },
    {
        "url": "https://ajp.psychiatryonline.org/action/showFeed?type=etoc&feed=rss&jc=ajp",
        "journal": "American Journal of Psychiatry",
        "source_prefix": "ajp",
    },
    {
        "url": "https://www.nature.com/mp.rss",
        "journal": "Molecular Psychiatry",
        "source_prefix": "mol_psych",
    },
    {
        "url": "https://www.biologicalpsychiatryjournal.com/rssFeed/S0006-3223",
        "journal": "Biological Psychiatry",
        "source_prefix": "biol_psych",
    },
    {
        "url": "https://academic.oup.com/rss/site_5504/advanceAccess_84.xml",
        "journal": "Schizophrenia Bulletin",
        "source_prefix": "schiz_bull",
    },
    {
        "url": "https://www.nature.com/npp.rss",
        "journal": "Neuropsychopharmacology",
        "source_prefix": "npp",
    },
    {
        "url": "https://onlinelibrary.wiley.com/action/showFeed?jc=13995618&type=etoc&feed=rss",
        "journal": "Bipolar Disorders",
        "source_prefix": "bipolar_dis",
    },
    {
        "url": "https://www.psychiatryclinics.com/rss/article",
        "journal": "Psychiatric Clinics of North America",
        "source_prefix": "psych_clinics",
    },
]


class RSSFetcher:
    """RSSフィードから論文を取得するフェッチャー"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_all(self) -> dict:
        stats = {"total": 0, "new": 0}
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            for feed_conf in RSS_FEEDS:
                try:
                    s = await self._fetch_feed(client, feed_conf)
                    stats["total"] += s["total"]
                    stats["new"] += s["new"]
                    logger.info(f"RSS [{feed_conf['journal']}]: {s['total']} fetched, {s['new']} new")
                except Exception as e:
                    logger.error(f"RSS [{feed_conf['journal']}] error: {e}")
        return stats

    async def _fetch_feed(self, client: httpx.AsyncClient, conf: dict) -> dict:
        resp = await client.get(conf["url"])
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)

        new_count = 0
        for entry in feed.entries:
            added = await self._upsert_entry(entry, conf)
            if added:
                new_count += 1

        await self.db.commit()
        return {"total": len(feed.entries), "new": new_count}

    async def _upsert_entry(self, entry, conf: dict) -> bool:
        source_id = entry.get("id") or entry.get("link") or entry.get("title", "")[:128]
        if not source_id:
            return False

        existing = await self.db.scalar(
            select(Paper).where(Paper.source == "rss", Paper.source_id == source_id)
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
                pub_date_str = published[:10] if published else ""
                try:
                    pub_year = int(pub_date_str[:4])
                except ValueError:
                    pass

        # Authors
        authors = [a.get("name", "") for a in (entry.get("authors") or [])]
        if not authors and entry.get("author"):
            authors = [entry.author]

        # DOI from link or id
        doi: Optional[str] = None
        link = entry.get("link", "")
        if "doi.org" in link:
            doi = link.split("doi.org/")[-1].strip()

        paper = Paper(
            source="rss",
            source_id=source_id,
            title=entry.get("title", ""),
            abstract=entry.get("summary", "") or None,
            authors=json.dumps(authors, ensure_ascii=False),
            journal=conf["journal"],
            pub_date=pub_date_str,
            pub_year=pub_year,
            url=link,
            doi=doi,
        )
        self.db.add(paper)
        return True

    async def log_result(self, stats: dict, error: Optional[str] = None):
        log = FetchLog(
            source="rss",
            status="success" if not error else "error",
            items_fetched=stats.get("total", 0),
            items_new=stats.get("new", 0),
            error_message=error,
            finished_at=datetime.utcnow(),
        )
        self.db.add(log)
        await self.db.commit()
