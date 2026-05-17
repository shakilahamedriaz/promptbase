from sqlalchemy import Boolean, Column, String, Text, TIMESTAMP
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    display_name = Column(String(100), nullable=False)
    avatar_url = Column(Text, nullable=True)
    auth_provider = Column(String(20), nullable=False, default="email", server_default="email")
    plan = Column(String(20), nullable=False, default="free", server_default="free")
    bio = Column(Text, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    last_login_at = Column(TIMESTAMP(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    groq_api_key = Column(String(255), nullable=True)
    openrouter_api_key = Column(String(255), nullable=True)

    # Relationships
    prompts = relationship("Prompt", back_populates="user", lazy="select")
    history = relationship("PromptHistory", back_populates="user", lazy="select")
    followers = relationship(
        "UserFollow",
        foreign_keys="UserFollow.following_id",
        back_populates="following_user",
        lazy="select",
        cascade="all, delete-orphan",
    )
    following = relationship(
        "UserFollow",
        foreign_keys="UserFollow.follower_id",
        back_populates="follower_user",
        lazy="select",
        cascade="all, delete-orphan",
    )
    favorites = relationship("PromptFavorite", back_populates="user", lazy="select", cascade="all, delete-orphan")
