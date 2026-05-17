"""Add marketplace support: public prompts, forks, ratings

Revision ID: 003
Revises: 002
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add marketplace fields to prompts
    op.add_column('prompts', sa.Column('is_public', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('prompts', sa.Column('fork_of_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_prompts_fork_of_id', 'prompts', 'prompts', ['fork_of_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_prompts_is_public', 'prompts', ['is_public'])

    # Create prompt_ratings table
    op.create_table(
        'prompt_ratings',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('prompt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.SmallInteger(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['prompt_id'], ['prompts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('prompt_id', 'user_id', name='uq_rating_prompt_user'),
    )
    op.create_index('ix_prompt_ratings_prompt_id', 'prompt_ratings', ['prompt_id'])


def downgrade() -> None:
    op.drop_index('ix_prompt_ratings_prompt_id', table_name='prompt_ratings')
    op.drop_table('prompt_ratings')
    op.drop_index('ix_prompts_is_public', table_name='prompts')
    op.drop_constraint('fk_prompts_fork_of_id', 'prompts', type_='foreignkey')
    op.drop_column('prompts', 'fork_of_id')
    op.drop_column('prompts', 'is_public')
