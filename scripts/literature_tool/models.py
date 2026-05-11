"""SQLAlchemy ORM モデル定義"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, Integer, Boolean, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Paper(Base):
    """論文テーブル — 全ソース共通"""
    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 識別子
    source: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    # source 値: "pubmed" | "medrxiv" | "biorxiv" | "jstage" | "rss" | "guideline"
    source_id: Mapped[str] = mapped_column(String(128), nullable=False)
    # PubMed の場合は PMID, medRxiv は DOI, J-STAGE は ArticleID など

    # 書誌情報
    title: Mapped[str] = mapped_column(Text, nullable=False)
    abstract: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    authors: Mapped[Optional[str]] = mapped_column(Text, nullable=True)      # JSON list string
    journal: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    pub_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)   # YYYY-MM-DD 等
    pub_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    # リンク
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    doi: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, index=True)
    pmc_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # 論文属性
    article_types: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list string
    mesh_terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)      # JSON list string
    keywords: Mapped[Optional[str]] = mapped_column(Text, nullable=True)        # JSON list string
    language: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    is_open_access: Mapped[bool] = mapped_column(Boolean, default=False)

    # AI要約（Phase 3）
    summary_ja: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary_generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # メタデータ
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_papers_source_source_id", "source", "source_id", unique=True),
        Index("ix_papers_pub_year_source", "pub_year", "source"),
    )

    def __repr__(self) -> str:
        return f"<Paper id={self.id} source={self.source} source_id={self.source_id}>"


class Alert(Base):
    """キーワードアラート登録テーブル（Phase 3）"""
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    keyword: Mapped[str] = mapped_column(String(256), nullable=False)
    sources: Mapped[str] = mapped_column(String(256), default="pubmed,medrxiv,jstage")  # comma-separated
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<Alert id={self.id} email={self.email} keyword={self.keyword}>"


class FetchLog(Base):
    """クロール実行ログ"""
    __tablename__ = "fetch_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)  # "success" | "error"
    items_fetched: Mapped[int] = mapped_column(Integer, default=0)
    items_new: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<FetchLog id={self.id} source={self.source} status={self.status}>"
