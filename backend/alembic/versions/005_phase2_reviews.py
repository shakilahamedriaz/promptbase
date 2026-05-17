"""Phase 2 improvements: Reviews system, variants tracking

Revision ID: 005
Revises: 004
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create prompt_reviews table for text reviews with ratings
    op.create_table(
        'prompt_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('prompt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('rating', sa.SmallInteger(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['prompt_id'], ['prompts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('prompt_id', 'user_id', name='uq_review_prompt_user'),
    )
    op.create_index('ix_prompt_reviews_prompt_id', 'prompt_reviews', ['prompt_id'])
    op.create_index('ix_prompt_reviews_user_id', 'prompt_reviews', ['user_id'])

    # Create review_helpful table for upvoting/downvoting reviews
    op.create_table(
        'review_helpful',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('review_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_helpful', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['prompt_reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('review_id', 'user_id', name='uq_helpful_review_user'),
    )
    op.create_index('ix_review_helpful_review_id', 'review_helpful', ['review_id'])


def downgrade() -> None:
    op.drop_index('ix_review_helpful_review_id', table_name='review_helpful')
    op.drop_table('review_helpful')
    op.drop_index('ix_prompt_reviews_user_id', table_name='prompt_reviews')
    op.drop_index('ix_prompt_reviews_prompt_id', table_name='prompt_reviews')
    op.drop_table('prompt_reviews')
