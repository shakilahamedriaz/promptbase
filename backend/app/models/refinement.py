from sqlalchemy import Column, ForeignKey, SmallInteger, String, Text, TIMESTAMP
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AIRefinement(Base):
    __tablename__ = "ai_refinements"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    prompt_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prompts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    original_body = Column(Text, nullable=False)
    refined_body = Column(Text, nullable=False)
    style = Column(String(20), nullable=False, default="professional", server_default="professional")
    explanation = Column(Text, nullable=True)
    score_before = Column(SmallInteger, nullable=True)
    score_after = Column(SmallInteger, nullable=True)
    # user_rating: 1 = thumbs up, -1 = thumbs down, NULL = no rating
    user_rating = Column(SmallInteger, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # Relationships
    prompt = relationship("Prompt", back_populates="refinements", lazy="select")
