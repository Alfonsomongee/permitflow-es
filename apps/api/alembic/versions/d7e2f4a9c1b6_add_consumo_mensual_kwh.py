"""add consumo_mensual_kwh to analisis_facturas

Revision ID: d7e2f4a9c1b6
Revises: c4d8e91a2b3f
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d7e2f4a9c1b6"
down_revision: Union[str, None] = "c4d8e91a2b3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "analisis_facturas",
        sa.Column("consumo_mensual_kwh", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analisis_facturas", "consumo_mensual_kwh")
