from sqlalchemy import Boolean, Column, ForeignKey, Integer, SmallInteger, String, Text, TIMESTAMP
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Prompt(Base):
    __tablename__ = "prompts"

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
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, default="general", server_default="general")
    tags = Column(
        ARRAY(Text),
        nullable=False,
        default=list,
        server_default=text("'{}'::text[]"),
    )
    is_favorite = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    use_count = Column(Integer, nullable=False, default=0, server_default=text("0"))
    quality_score = Column(SmallInteger, nullable=True)
    variables = Column(
        JSONB(astext_type=Text()),
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    is_deleted = Column(Boolean, nullable=False, default=False, server_default=text("false"))
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
    user = relationship("User", back_populates="prompts", lazy="select")
    versions = relationship("PromptVersion", back_populates="prompt", lazy="select", cascade="all, delete-orphan")
    history = relationship("PromptHistory", back_populates="prompt", lazy="select")
    refinements = relationship("AIRefinement", back_populates="prompt", lazy="select")
