"use client";

import { useState } from "react";
import { StatsExpedientesTable } from "@/components/dashboard/StatsExpedientesTable";
import type { ExpedienteRow } from "@/components/dashboard/StatsExpedientesTable";

const DEMO_EXPEDIENTES: ExpedienteRow[] = [
  { id: "1", referencia: "EXP-2026-001", tipo_instalacion: "Fotovoltaica", estado: "aprobado", municipio: "Sevilla", fecha_creacion: "2026-01-15" },
  { id: "2", referencia: "EXP-2026-002", tipo_instalacion: "IRVE", estado: "en_revision", municipio: "Madrid", fecha_creacion: "2026-02-03" },
  { id: "3", referencia: "EXP-2026-003", tipo_instalacion: "Aerotermia", estado: "subsanacion", municipio: "Barcelona", fecha_creacion: "2026-02-20" },
  { id: "4", referencia: "EXP-2026-004", tipo_instalacion: "Fotovoltaica", estado: "presentado", municipio: "Valencia", fecha_creacion: "2026-03-05" },
  { id: "5", referencia: "EXP-2026-005", tipo_instalacion: "ACS", estado: "aprobado", municipio: "Bilbao", fecha_creacion: "2026-03-18" },
  { id: "6", referencia: "EXP-2026-006", tipo_instalacion: "Gas", estado: "aprobado", municipio: "Zaragoza", fecha_creacion: "2026-04-01" },
  { id: "7", referencia: "EXP-2026-007", tipo_instalacion: "Fotovoltaica", estado: "en_revision", municipio: "Palma", fecha_creacion: "2026-04-14" },
  { id: "8", referencia: "EXP-2026-008", tipo_instalacion: "IRVE", estado: "aprobado", municipio: "Murcia", fecha_creacion: "2026-05-02" },
  { id: "9", referencia: "EXP-2026-009", tipo_instalacion: "Aerotermia", estado: "aprobado", municipio: "Ávila", fecha_creacion: "2026-05-20" },
  { id: "10", referencia: "EXP-2026-010", tipo_instalacion: "Fotovoltaica", estado: "subsanacion", municipio: "Córdoba", fecha_creacion: "2026-06-08" },
];

const PAGE_SIZE = 5;

export function StatsExpedientesTableWrapper() {
  const [page, setPage] = useState(1);
  const start = (page - 1) * PAGE_SIZE;
  const sliced = DEMO_EXPEDIENTES.slice(start, start + PAGE_SIZE);

  return (
    <StatsExpedientesTable
      data={sliced}
      page={page}
      pageSize={PAGE_SIZE}
      total={DEMO_EXPEDIENTES.length}
      onPageChange={setPage}
    />
  );
}
