"""simulacion_rgpd_hardening_cups_hash_estado_tz

Revision ID: 8ff70755e4d7
Revises: b365d684e87c
Create Date: 2026-07-27 15:34:05.886792

Cambios de este sprint (Simulador RGPD hardening):
- analisis_facturas: eliminar cups (dato personal en claro),
  anadir cups_hash (HMAC), extraccion_fuente (JSON por campo),
  fuente_dato (leido|estimado), TZ-aware en creado_en.
- estudios_energeticos: eliminar ip_origen, anadir estado
  (pendiente|completado|error), nullable en resultado_json,
  TZ-aware en creado_en, indice sobre analisis_factura_id.
- catalogo_componentes: TZ-aware en creado_en.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8ff70755e4d7'
down_revision: Union[str, Sequence[str], None] = 'b365d684e87c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- analisis_facturas ---
    op.add_column('analisis_facturas', sa.Column('cups_hash', sa.String(), nullable=True))
    op.add_column('analisis_facturas', sa.Column('extraccion_fuente', sa.JSON(), nullable=True))
    op.add_column('analisis_facturas', sa.Column('fuente_dato', sa.String(), nullable=True))
    op.alter_column(
        'analisis_facturas', 'creado_en',
        existing_type=postgresql.TIMESTAMP(),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
    )
    # Eliminar cups en claro (dato personal: identifica domicilio).
    # AVISO: si la columna cups tiene datos existentes que necesitas conservar,
    # ejecuta un UPDATE previo para rellenar cups_hash antes de hacer el DROP.
    op.drop_column('analisis_facturas', 'cups')

    # --- estudios_energeticos ---
    # server_default='completado' para que las filas existentes tengan un estado valido.
    op.add_column(
        'estudios_energeticos',
        sa.Column('estado', sa.String(), nullable=False, server_default='completado'),
    )
    op.alter_column(
        'estudios_energeticos', 'resultado_json',
        existing_type=postgresql.JSON(astext_type=sa.Text()),
        nullable=True,
    )
    op.alter_column(
        'estudios_energeticos', 'creado_en',
        existing_type=postgresql.TIMESTAMP(),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
    )
    op.create_index(
        'ix_estudios_analisis_id',
        'estudios_energeticos',
        ['analisis_factura_id'],
        unique=False,
    )
    # Eliminar ip_origen: sin funcion de producto, es dato personal persistente.
    op.drop_column('estudios_energeticos', 'ip_origen')

    # --- catalogo_componentes ---
    op.alter_column(
        'catalogo_componentes', 'creado_en',
        existing_type=postgresql.TIMESTAMP(),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
    )


def downgrade() -> None:
    # --- catalogo_componentes ---
    op.alter_column(
        'catalogo_componentes', 'creado_en',
        existing_type=sa.DateTime(timezone=True),
        type_=postgresql.TIMESTAMP(),
        existing_nullable=True,
    )

    # --- estudios_energeticos ---
    op.add_column('estudios_energeticos', sa.Column('ip_origen', sa.VARCHAR(), nullable=True))
    op.drop_index('ix_estudios_analisis_id', table_name='estudios_energeticos')
    op.alter_column(
        'estudios_energeticos', 'creado_en',
        existing_type=sa.DateTime(timezone=True),
        type_=postgresql.TIMESTAMP(),
        existing_nullable=True,
    )
    op.alter_column(
        'estudios_energeticos', 'resultado_json',
        existing_type=postgresql.JSON(astext_type=sa.Text()),
        nullable=False,
    )
    op.drop_column('estudios_energeticos', 'estado')

    # --- analisis_facturas ---
    op.add_column('analisis_facturas', sa.Column('cups', sa.VARCHAR(), nullable=True))
    op.alter_column(
        'analisis_facturas', 'creado_en',
        existing_type=sa.DateTime(timezone=True),
        type_=postgresql.TIMESTAMP(),
        existing_nullable=True,
    )
    op.drop_column('analisis_facturas', 'fuente_dato')
    op.drop_column('analisis_facturas', 'extraccion_fuente')
    op.drop_column('analisis_facturas', 'cups_hash')
