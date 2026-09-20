"""add_milestone_id_to_tasks

Revision ID: c17db5a7ab4c
Revises: 8435ff1157fb
Create Date: 2026-09-20 13:10:56.823924
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c17db5a7ab4c'
down_revision: Union[str, None] = '8435ff1157fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('milestone_id', sa.String(length=36), nullable=True))
    op.create_index(op.f('ix_tasks_milestone_id'), 'tasks', ['milestone_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tasks_milestone_id'), table_name='tasks')
    op.drop_column('tasks', 'milestone_id')
