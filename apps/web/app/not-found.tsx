import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Página no encontrada — PermitFlow" };

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-primary">Error 404</p>
      <h1 className="text-2xl font-medium text-text-primary">No encontramos esta página</h1>
      <p className="max-w-md text-sm text-text-secondary">
        Puede que el enlace haya cambiado o que el expediente ya no exista. Comprueba la dirección o vuelve al inicio.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/expedientes" className={buttonVariants({ variant: "default" })}>
          Ir a mis expedientes
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
