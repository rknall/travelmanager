"""Add cover image fields to events

Revision ID: 39501bd4d6c1
Revises: cb63b9a8c1b4
Create Date: 2025-12-01 21:51:44.088275

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '39501bd4d6c1'
down_revision: Union[str, None] = 'cb63b9a8c1b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('cover_image_url', sa.String(length=500), nullable=True))
    op.add_column('events', sa.Column('cover_thumbnail_url', sa.String(length=500), nullable=True))
    op.add_column('events', sa.Column('cover_photographer_name', sa.String(length=200), nullable=True))
    op.add_column('events', sa.Column('cover_photographer_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('events', 'cover_photographer_url')
    op.drop_column('events', 'cover_photographer_name')
    op.drop_column('events', 'cover_thumbnail_url')
    op.drop_column('events', 'cover_image_url')
