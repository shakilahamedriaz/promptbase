from sqlalchemy import Column, ForeignKey, SmallInteger, TIMESTAMP, UniqueConstraint
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from sqlalchemy.orm import relationship


class PromptRating(Base):
    __tablename__ = "prompt_ratings"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    prompt_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prompts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    score = Column(SmallInteger, nullable=False)  # 1-5
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    __table_args__ = (
        UniqueConstraint("prompt_id", "user_id", name="uq_rating_prompt_user"),
    )

    # Relationships
    prompt = relationship("Prompt", back_populates="ratings", lazy="select")
    user = relationship("User", lazy="select")
