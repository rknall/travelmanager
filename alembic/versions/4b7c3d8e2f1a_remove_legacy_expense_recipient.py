"""remove_legacy_expense_recipient

Revision ID: 4b7c3d8e2f1a
Revises: 3a8f2c9d1e5b
Create Date: 2025-12-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4b7c3d8e2f1a"
down_revision: Union[str, None] = "3a8f2c9d1e5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop legacy expense recipient fields from companies table
    # These have been replaced by the company_contacts system
    with op.batch_alter_table("companies") as batch_op:
        batch_op.drop_column("expense_recipient_email")
        batch_op.drop_column("expense_recipient_name")


def downgrade() -> None:
    # Re-add the legacy expense recipient columns
    with op.batch_alter_table("companies") as batch_op:
        batch_op.add_column(
            sa.Column("expense_recipient_name", sa.String(length=200), nullable=True)
        )
        batch_op.add_column(
            sa.Column("expense_recipient_email", sa.String(length=255), nullable=True)
        )
