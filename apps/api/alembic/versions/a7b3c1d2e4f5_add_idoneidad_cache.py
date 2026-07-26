"""add idoneidad_cache table

Revision ID: a7b3c1d2e4f5
Revises: f322ac0b98a0
Create Date: 2026-07-26 18:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "a7b3c1d2e4f5"
down_revision: Union[str, None] = "f322ac0b98a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "idoneidad_cache",
        sa.Column("clave", sa.String(), nullable=False, comment="Formato: pvgis:{lat_2dec}:{lon_2dec}:{angle}:{aspect}"),
        sa.Column("payload", JSONB(), nullable=False),
        sa.Column("calculado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("clave"),
    )


def downgrade() -> None:
    op.drop_table("idoneidad_cache")
