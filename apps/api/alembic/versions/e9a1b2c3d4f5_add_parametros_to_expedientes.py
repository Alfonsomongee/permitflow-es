"""add parametros (jsonb) to expedientes

Guarda el payload COMPLETO del clasificador con el que se generó el plan. Hasta
ahora el expediente persistía solo 12 de ~48 campos, y /validar, /presupuesto y
cualquier recálculo reconstruían la clasificación desde esa fila incompleta
(422 o falsos "faltan datos" en Madrid, Cataluña, ACS...). Auditoría 2026-10-01, F-03.

Revision ID: e9a1b2c3d4f5
Revises: d7e2f4a9c1b6
Create Date: 2026-10-01 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e9a1b2c3d4f5"
down_revision: Union[str, None] = "d7e2f4a9c1b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "expedientes",
        sa.Column("parametros", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("expedientes", "parametros")
