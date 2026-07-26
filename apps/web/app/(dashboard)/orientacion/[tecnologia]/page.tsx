import { notFound } from "next/navigation";
import { TECNOLOGIAS } from "@/content/tecnologias";
import type { FichaTecnologia } from "@/content/tecnologias";
import { FichaTecnologiaView } from "@/components/orientacion/FichaTecnologia";

const VALID_IDS = new Set<string>(TECNOLOGIAS.map((t) => t.id));

type Props = {
  params: Promise<{ tecnologia: string }>;
};

export function generateStaticParams() {
  return TECNOLOGIAS.map((t) => ({ tecnologia: t.id }));
}

export default async function TecnologiaPage({ params }: Props) {
  const { tecnologia } = await params;

  if (!VALID_IDS.has(tecnologia)) {
    notFound();
  }

  const ficha = TECNOLOGIAS.find(
    (t) => t.id === tecnologia,
  ) as FichaTecnologia;

  return <FichaTecnologiaView ficha={ficha} />;
}
