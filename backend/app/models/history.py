from sqlalchemy import Boolean, Column, ForeignKey, String, Text, TIMESTAMP
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PromptHistory(Base):
    __tablename__ = "prompt_history"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prompt_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prompts.id", ondelete="SET NULL"),
        nullable=True,
    )
    body_snapshot = Column(Text, nullable=False)
    platform = Column(String(50), nullable=False, default="unknown", server_default="unknown")
    used_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
        index=True,
    )
    was_refined = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    # Relationships
    user = relationship("User", back_populates="history", lazy="select")
    prompt = relationship("Prompt", back_populates="history", lazy="select")
