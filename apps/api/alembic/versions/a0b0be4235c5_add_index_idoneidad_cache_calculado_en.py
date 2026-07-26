"""add_index_idoneidad_cache_calculado_en

Revision ID: a0b0be4235c5
Revises: a7b3c1d2e4f5
Create Date: 2026-07-26 19:41:28.132942

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0b0be4235c5'
down_revision: Union[str, Sequence[str], None] = 'a7b3c1d2e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index("ix_idoneidad_cache_calculado_en", "idoneidad_cache", ["calculado_en"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_idoneidad_cache_calculado_en", "idoneidad_cache")
