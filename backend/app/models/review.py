from sqlalchemy import Column, ForeignKey, Integer, SmallInteger, String, Text, TIMESTAMP, Boolean
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PromptReview(Base):
    __tablename__ = "prompt_reviews"

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
        index=True,
    )
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    rating = Column(SmallInteger, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # Relationships
    prompt = relationship("Prompt", back_populates="reviews", lazy="select")
    user = relationship("User", lazy="select")
    helpful_votes = relationship("ReviewHelpful", back_populates="review", lazy="select", cascade="all, delete-orphan")


class ReviewHelpful(Base):
    __tablename__ = "review_helpful"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    review_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prompt_reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_helpful = Column(Boolean, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # Relationships
    review = relationship("PromptReview", back_populates="helpful_votes", lazy="select")
