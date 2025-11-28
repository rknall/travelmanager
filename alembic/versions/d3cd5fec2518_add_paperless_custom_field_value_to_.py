"""add_paperless_custom_field_value_to_events

Revision ID: d3cd5fec2518
Revises: 5407cda97a67
Create Date: 2025-11-28 13:59:06.128975

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3cd5fec2518'
down_revision: Union[str, None] = '5407cda97a67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'events',
        sa.Column('paperless_custom_field_value', sa.String(200), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('events', 'paperless_custom_field_value')
