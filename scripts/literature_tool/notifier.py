"""
キーワードアラートメール通知エンジン（Phase 3）

登録されたキーワードにマッチする新着論文をメールで通知する。
aiosmtplib を使った非同期SMTP送信。
"""
import json
import logging
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

import aiosmtplib
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from config import settings
from models import Alert, Paper

logger = logging.getLogger(__name__)


class AlertNotifier:
    """キーワードアラートの検索・メール通知クラス"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_all_alerts(self) -> dict:
        """全アクティブアラートを処理してメールを送信"""
        if not settings.smtp_user or not settings.smtp_password:
            logger.warning("SMTP設定が不完全です。メール通知をスキップします。")
            return {"processed": 0, "sent": 0}

        # アクティブアラートを取得
        alerts = (await self.db.execute(
            select(Alert).where(Alert.is_active == True)
        )).scalars().all()

        sent_count = 0
        for alert in alerts:
            try:
                matched = await self._find_matching_papers(alert)
                if matched:
                    await self._send_alert_email(alert, matched)
                    alert.last_sent_at = datetime.utcnow()
                    sent_count += 1
            except Exception as e:
                logger.error(f"Alert {alert.id} ({alert.email}/{alert.keyword}) error: {e}")

        await self.db.commit()
        return {"processed": len(alerts), "sent": sent_count}

    async def _find_matching_papers(self, alert: Alert) -> List[Paper]:
        """アラートのキーワードにマッチする新着論文を検索"""
        # 前回送信以降の論文のみ（初回は7日以内）
        since = alert.last_sent_at or (datetime.utcnow() - timedelta(days=7))

        sources = [s.strip() for s in alert.sources.split(",") if s.strip()]
        keyword = f"%{alert.keyword}%"

        text_match = or_(
            Paper.title.ilike(keyword),
            Paper.abstract.ilike(keyword),
            Paper.keywords.ilike(keyword),
        )
        conds = [
            text_match,
            Paper.fetched_at >= since,
        ]
        if sources:
            conds.append(Paper.source.in_(sources))

        papers = (await self.db.execute(
            select(Paper)
            .where(and_(*conds))
            .order_by(Paper.fetched_at.desc())
            .limit(10)
        )).scalars().all()

        return list(papers)

    async def _send_alert_email(self, alert: Alert, papers: List[Paper]):
        """HTML メールを構築して送信"""
        html_body = self._build_email_html(alert, papers)
        text_body = self._build_email_text(alert, papers)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"【精神医学論文アラート】「{alert.keyword}」の新着 {len(papers)}件"
        msg["From"]    = settings.alert_from_address or settings.smtp_user
        msg["To"]      = alert.email

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info(f"Alert email sent: {alert.email} / {alert.keyword} / {len(papers)} papers")

    def _build_email_html(self, alert: Alert, papers: List[Paper]) -> str:
        items_html = ""
        for p in papers:
            authors = ""
            if p.authors:
                try:
                    auth_list = json.loads(p.authors)
                    authors = ", ".join(auth_list[:5])
                    if len(auth_list) > 5:
                        authors += " ほか"
                except Exception:
                    pass
            doi_link = f'<a href="https://doi.org/{p.doi}" style="color:#0284c7;">DOI</a>' if p.doi else ""
            pubmed_link = f'<a href="https://pubmed.ncbi.nlm.nih.gov/{p.source_id}/" style="color:#0284c7;">PubMed</a>' if p.source == "pubmed" else ""
            items_html += f"""
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:12px;background:#fff;">
              <p style="font-size:11px;color:#6b7280;margin:0 0 4px;">{p.source.upper()} · {p.pub_date or ''} · {p.journal or ''}</p>
              <p style="font-size:14px;font-weight:600;color:#1e3a5f;margin:0 0 4px;line-height:1.5;">{p.title}</p>
              {f'<p style="font-size:11px;color:#6b7280;margin:0 0 6px;">{authors}</p>' if authors else ''}
              <div style="font-size:11px;display:flex;gap:8px;">{pubmed_link} {doi_link}</div>
            </div>"""

        return f"""<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:'Noto Sans JP',sans-serif;background:#f4f2ef;padding:24px;color:#232323;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <div style="width:32px;height:32px;background:#1d4ed8;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-weight:700;font-size:14px;">Ψ</span>
      </div>
      <span style="font-weight:700;font-size:16px;color:#1e3a5f;">精神科臨床ガイド — 論文アラート</span>
    </div>
    <p style="font-size:13px;color:#374151;margin:0 0 16px;">
      キーワード「<strong>{alert.keyword}</strong>」に一致する新着論文が <strong>{len(papers)}件</strong> 見つかりました。
    </p>
    {items_html}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
    <p style="font-size:10px;color:#9ca3af;margin:0;">
      このメールは精神科臨床ガイド 論文アラートサービスから自動送信されています。<br>
      配信停止は <a href="https://qwwzzjx4bs.github.io/psych-guide/literature-search.html" style="color:#6b7280;">こちら</a> の設定タブから行えます。
    </p>
  </div>
</body></html>"""

    def _build_email_text(self, alert: Alert, papers: List[Paper]) -> str:
        lines = [
            f"精神科臨床ガイド — 論文アラート",
            f"キーワード「{alert.keyword}」の新着論文 {len(papers)}件",
            "",
        ]
        for i, p in enumerate(papers, 1):
            lines.append(f"[{i}] {p.title}")
            lines.append(f"    {p.source.upper()} · {p.pub_date or ''} · {p.journal or ''}")
            if p.source == "pubmed":
                lines.append(f"    https://pubmed.ncbi.nlm.nih.gov/{p.source_id}/")
            if p.doi:
                lines.append(f"    https://doi.org/{p.doi}")
            lines.append("")
        return "\n".join(lines)


async def run_alert_notifications(db: AsyncSession) -> dict:
    """スケジューラから呼ばれるエントリポイント"""
    notifier = AlertNotifier(db)
    return await notifier.process_all_alerts()
