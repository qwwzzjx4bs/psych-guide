"""
APScheduler を使った定期クロールスケジューラ

FastAPI のライフサイクルイベントで開始・停止する。
"""
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import settings
from database import AsyncSessionLocal
from fetchers import PubMedFetcher, RSSFetcher, MedRxivFetcher, JstageFetcher, GuidelineFetcher
from notifier import run_alert_notifications

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Tokyo")


async def run_pubmed_fetch():
    """PubMed 定期クロールジョブ"""
    logger.info(f"[Scheduler] PubMed fetch started at {datetime.now()}")
    async with AsyncSessionLocal() as db:
        fetcher = PubMedFetcher(db)
        try:
            stats = await fetcher.fetch_recent(days=7)
            await fetcher.log_result(stats)
            logger.info(f"[Scheduler] PubMed fetch done: {stats}")
        except Exception as e:
            await fetcher.log_result({}, error=str(e))
            logger.error(f"[Scheduler] PubMed fetch error: {e}")


async def run_rss_fetch():
    """RSS フィード定期クロールジョブ"""
    logger.info(f"[Scheduler] RSS fetch started at {datetime.now()}")
    async with AsyncSessionLocal() as db:
        fetcher = RSSFetcher(db)
        try:
            stats = await fetcher.fetch_all()
            await fetcher.log_result(stats)
            logger.info(f"[Scheduler] RSS fetch done: {stats}")
        except Exception as e:
            await fetcher.log_result({}, error=str(e))
            logger.error(f"[Scheduler] RSS fetch error: {e}")


async def run_medrxiv_fetch():
    """medRxiv 定期クロールジョブ"""
    logger.info(f"[Scheduler] medRxiv fetch started at {datetime.now()}")
    async with AsyncSessionLocal() as db:
        fetcher = MedRxivFetcher(db)
        try:
            stats = await fetcher.fetch_recent(days=14)
            await fetcher.log_result(stats)
            logger.info(f"[Scheduler] medRxiv fetch done: {stats}")
        except Exception as e:
            await fetcher.log_result({}, error=str(e))
            logger.error(f"[Scheduler] medRxiv fetch error: {e}")


async def run_jstage_fetch():
    """J-STAGE 定期クロールジョブ"""
    logger.info(f"[Scheduler] J-STAGE fetch started at {datetime.now()}")
    async with AsyncSessionLocal() as db:
        fetcher = JstageFetcher(db)
        try:
            stats = await fetcher.fetch_recent(days=30)
            await fetcher.log_result(stats)
            logger.info(f"[Scheduler] J-STAGE fetch done: {stats}")
        except Exception as e:
            await fetcher.log_result({}, error=str(e))
            logger.error(f"[Scheduler] J-STAGE fetch error: {e}")


async def run_guidelines_fetch():
    """ガイドライン更新監視ジョブ"""
    logger.info(f"[Scheduler] Guidelines fetch started at {datetime.now()}")
    async with AsyncSessionLocal() as db:
        fetcher = GuidelineFetcher(db)
        try:
            stats = await fetcher.fetch_all()
            await fetcher.log_result(stats)
            logger.info(f"[Scheduler] Guidelines fetch done: {stats}")
        except Exception as e:
            await fetcher.log_result({}, error=str(e))
            logger.error(f"[Scheduler] Guidelines fetch error: {e}")


def setup_scheduler():
    """スケジューラにジョブを登録する"""
    interval_hours = settings.fetch_interval_hours

    scheduler.add_job(
        run_pubmed_fetch,
        trigger=IntervalTrigger(hours=interval_hours),
        id="pubmed_fetch",
        name="PubMed定期クロール",
        replace_existing=True,
    )
    scheduler.add_job(
        run_rss_fetch,
        trigger=IntervalTrigger(hours=interval_hours),
        id="rss_fetch",
        name="RSSフィード定期クロール",
        replace_existing=True,
    )
    scheduler.add_job(
        run_medrxiv_fetch,
        trigger=IntervalTrigger(hours=interval_hours * 2),  # 少し頻度を落とす
        id="medrxiv_fetch",
        name="medRxiv定期クロール",
        replace_existing=True,
    )
    scheduler.add_job(
        run_jstage_fetch,
        trigger=IntervalTrigger(hours=interval_hours * 2),
        id="jstage_fetch",
        name="J-STAGE定期クロール",
        replace_existing=True,
    )
    scheduler.add_job(
        run_guidelines_fetch,
        trigger=IntervalTrigger(hours=24),  # ガイドラインは1日1回
        id="guidelines_fetch",
        name="ガイドライン更新監視",
        replace_existing=True,
    )
    scheduler.add_job(
        run_alert_notifications_job,
        trigger=IntervalTrigger(hours=24),  # アラートメールは1日1回
        id="alert_notifications",
        name="キーワードアラートメール通知",
        replace_existing=True,
    )

    return scheduler


async def run_alert_notifications_job():
    """アラート通知ジョブ（スケジューラ用ラッパー）"""
    logger.info(f"[Scheduler] Alert notifications started at {datetime.now()}")
    async with AsyncSessionLocal() as db:
        try:
            stats = await run_alert_notifications(db)
            logger.info(f"[Scheduler] Alert notifications done: {stats}")
        except Exception as e:
            logger.error(f"[Scheduler] Alert notifications error: {e}")
