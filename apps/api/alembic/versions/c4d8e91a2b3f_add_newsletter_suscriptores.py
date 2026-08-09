"""add newsletter_suscriptores table

Revision ID: c4d8e91a2b3f
Revises: 8ff70755e4d7
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "c4d8e91a2b3f"
down_revision: Union[str, None] = "8ff70755e4d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "newsletter_suscriptores",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("suscrito_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(
        op.f("ix_newsletter_suscriptores_email"), "newsletter_suscriptores", ["email"], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_newsletter_suscriptores_email"), table_name="newsletter_suscriptores")
    op.drop_table("newsletter_suscriptores")
