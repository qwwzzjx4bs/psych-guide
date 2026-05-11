"""
PubMed（NCBI E-utilities）フェッチャー

精神医学関連の最新論文を定期取得してDBに保存する。
APIキーなし: 3 req/s, あり: 10 req/s
https://www.ncbi.nlm.nih.gov/books/NBK25497/
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Optional
from xml.etree import ElementTree as ET

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from models import Paper, FetchLog

logger = logging.getLogger(__name__)

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

# 精神医学の代表的な MeSH クエリ（定期クロール対象）
PSYCH_QUERIES = [
    ("psychiatry[MeSH]", "psychiatry"),
    ("schizophrenia[MeSH]", "schizophrenia"),
    ("depressive disorder, major[MeSH]", "depression"),
    ("bipolar disorder[MeSH]", "bipolar"),
    ("anxiety disorders[MeSH]", "anxiety"),
    ("dementia[MeSH]", "dementia"),
]


class PubMedFetcher:
    """PubMed E-utilities を使った定期クロールフェッチャー"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.api_key = settings.ncbi_api_key

    def _ncbi_url(self, endpoint: str, **params) -> str:
        base = f"{NCBI_BASE}/{endpoint}.fcgi"
        p = "&".join(f"{k}={v}" for k, v in params.items())
        if self.api_key:
            p += f"&api_key={self.api_key}"
        return f"{base}?{p}"

    async def _get(self, client: httpx.AsyncClient, url: str) -> dict:
        """レート制限を考慮した GET リクエスト"""
        delay = 0.12 if self.api_key else 0.35  # API key あり: ~8/s, なし: ~2.8/s
        await asyncio.sleep(delay)
        resp = await client.get(url, timeout=30.0)
        resp.raise_for_status()
        return resp.json()

    async def fetch_recent(self, days: int = 7, retmax: int = 200) -> dict:
        """直近 N 日の精神医学論文を全クエリ分取得"""
        stats = {"total": 0, "new": 0}
        async with httpx.AsyncClient() as client:
            for query, label in PSYCH_QUERIES:
                try:
                    s = await self._fetch_query(client, query, days=days, retmax=retmax)
                    stats["total"] += s["total"]
                    stats["new"] += s["new"]
                    logger.info(f"PubMed [{label}]: {s['total']} fetched, {s['new']} new")
                except Exception as e:
                    logger.error(f"PubMed [{label}] error: {e}")
        return stats

    async def _fetch_query(self, client: httpx.AsyncClient, query: str, days: int, retmax: int) -> dict:
        today = datetime.utcnow()
        from_date = today - timedelta(days=days)
        date_filter = f"{from_date.strftime('%Y/%m/%d')}[PDat]:{today.strftime('%Y/%m/%d')}[PDat]"
        full_query = f"({query}) AND {date_filter}"

        search_url = self._ncbi_url(
            "esearch",
            db="pubmed",
            term=httpx.QueryParams(term=full_query).get("term", full_query),
            retmax=retmax,
            sort="pub+date",
            retmode="json",
        )
        # Build URL manually for proper encoding
        import urllib.parse
        params = {
            "db": "pubmed",
            "term": full_query,
            "retmax": str(retmax),
            "sort": "pub date",
            "retmode": "json",
        }
        if self.api_key:
            params["api_key"] = self.api_key
        search_url = f"{NCBI_BASE}/esearch.fcgi?" + urllib.parse.urlencode(params)

        await asyncio.sleep(0.35 if not self.api_key else 0.12)
        resp = await client.get(search_url, timeout=30.0)
        resp.raise_for_status()
        data = resp.json()
        ids = data.get("esearchresult", {}).get("idlist", [])
        if not ids:
            return {"total": 0, "new": 0}

        # Batch summary
        sum_params = {
            "db": "pubmed",
            "id": ",".join(ids),
            "retmode": "json",
        }
        if self.api_key:
            sum_params["api_key"] = self.api_key
        sum_url = f"{NCBI_BASE}/esummary.fcgi?" + urllib.parse.urlencode(sum_params)
        await asyncio.sleep(0.35 if not self.api_key else 0.12)
        sum_resp = await client.get(sum_url, timeout=30.0)
        sum_resp.raise_for_status()
        sum_data = sum_resp.json()

        new_count = 0
        for pmid in ids:
            art = sum_data.get("result", {}).get(pmid)
            if not art:
                continue
            added = await self._upsert_article(art)
            if added:
                new_count += 1

        await self.db.commit()
        return {"total": len(ids), "new": new_count}

    async def _upsert_article(self, art: dict) -> bool:
        """DBに存在しない場合のみ INSERT、既存の場合は skip（True=new）"""
        pmid = str(art.get("uid", ""))
        if not pmid:
            return False

        existing = await self.db.scalar(
            select(Paper).where(Paper.source == "pubmed", Paper.source_id == pmid)
        )
        if existing:
            return False

        pub_date_str = art.get("pubdate", "")
        pub_year: Optional[int] = None
        try:
            pub_year = int(pub_date_str.split(" ")[0])
        except (ValueError, IndexError):
            pass

        authors_list = [a.get("name", "") for a in (art.get("authors") or [])]
        article_types = art.get("pubtype") or []
        article_ids = art.get("articleids") or []
        doi = next((x["value"] for x in article_ids if x.get("idtype") == "doi"), None)
        pmc_id = next((x["value"] for x in article_ids if x.get("idtype") == "pmc"), None)

        paper = Paper(
            source="pubmed",
            source_id=pmid,
            title=art.get("title", ""),
            authors=json.dumps(authors_list, ensure_ascii=False),
            journal=art.get("fulljournalname") or art.get("source", ""),
            pub_date=pub_date_str,
            pub_year=pub_year,
            url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            doi=doi,
            pmc_id=pmc_id,
            article_types=json.dumps(article_types, ensure_ascii=False),
            is_open_access=bool(pmc_id),
        )
        self.db.add(paper)
        return True

    async def fetch_abstract(self, pmid: str) -> Optional[str]:
        """個別 PMIDの抄録をXMLから取得してDBを更新"""
        import urllib.parse
        params = {"db": "pubmed", "id": pmid, "rettype": "abstract", "retmode": "xml"}
        if self.api_key:
            params["api_key"] = self.api_key
        url = f"{NCBI_BASE}/efetch.fcgi?" + urllib.parse.urlencode(params)

        async with httpx.AsyncClient() as client:
            await asyncio.sleep(0.35 if not self.api_key else 0.12)
            resp = await client.get(url, timeout=30.0)
            resp.raise_for_status()
            xml_text = resp.text

        root = ET.fromstring(xml_text)
        texts = root.findall(".//AbstractText")
        if not texts:
            return None

        if len(texts) == 1:
            abstract = texts[0].text or ""
        else:
            parts = []
            for t in texts:
                label = t.get("Label") or t.get("NlmCategory") or ""
                text = t.text or ""
                parts.append(f"{label}: {text}" if label else text)
            abstract = "\n\n".join(parts)

        # DB更新
        paper = await self.db.scalar(
            select(Paper).where(Paper.source == "pubmed", Paper.source_id == pmid)
        )
        if paper:
            paper.abstract = abstract
            await self.db.commit()

        return abstract

    async def log_result(self, stats: dict, error: Optional[str] = None):
        log = FetchLog(
            source="pubmed",
            status="success" if not error else "error",
            items_fetched=stats.get("total", 0),
            items_new=stats.get("new", 0),
            error_message=error,
            finished_at=datetime.utcnow(),
        )
        self.db.add(log)
        await self.db.commit()
