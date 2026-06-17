import Link from "next/link";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4 text-center">
        PermitFlow ES
      </h1>
      <p className="text-lg text-text-secondary text-center max-w-2xl">
        Tramita cualquier instalación técnica en España sin perder tiempo.
      </p>
      
      <div className="mt-8 flex gap-4">
        <div className="px-4 py-2 bg-primary text-white rounded shadow text-sm font-semibold">
          Color Primary
        </div>
        <div className="px-4 py-2 bg-success text-white rounded shadow text-sm font-semibold">
          Color Success
        </div>
        <div className="px-4 py-2 bg-warning text-white rounded shadow text-sm font-semibold">
          Color Warning
        </div>
        <div className="px-4 py-2 bg-danger text-white rounded shadow text-sm font-semibold">
          Color Danger
        </div>
      </div>

      <div className="mt-12">
        <Link href="/nueva-instalacion" className="px-8 py-4 bg-primary text-white text-lg font-bold rounded-lg shadow-lg hover:bg-primary-dark transition">
          Ir al Clasificador de Trámites
        </Link>
      </div>
    </div>
  );
}
