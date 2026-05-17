"""Phase 1 improvements: Creator profiles, favorites, descriptions

Revision ID: 004
Revises: 003
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add bio to users for creator profiles
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))

    # Add description to prompts (separate from body)
    op.add_column('prompts', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('prompts', sa.Column('price_credits', sa.Integer(), nullable=True))

    # Create user_follows table for creator following
    op.create_table(
        'user_follows',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('follower_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('following_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['follower_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['following_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'following_id', name='uq_follow_pair'),
    )
    op.create_index('ix_user_follows_follower', 'user_follows', ['follower_id'])
    op.create_index('ix_user_follows_following', 'user_follows', ['following_id'])

    # Create prompt_favorites table for bookmarking
    op.create_table(
        'prompt_favorites',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('prompt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['prompt_id'], ['prompts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'prompt_id', name='uq_favorite_pair'),
    )
    op.create_index('ix_prompt_favorites_user', 'prompt_favorites', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_prompt_favorites_user', table_name='prompt_favorites')
    op.drop_table('prompt_favorites')
    op.drop_index('ix_user_follows_following', table_name='user_follows')
    op.drop_index('ix_user_follows_follower', table_name='user_follows')
    op.drop_table('user_follows')
    op.drop_column('prompts', 'price_credits')
    op.drop_column('prompts', 'description')
    op.drop_column('users', 'bio')
