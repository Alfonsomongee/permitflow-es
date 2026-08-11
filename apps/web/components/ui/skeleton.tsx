import { cn } from "@/lib/utils";

/**
 * Bloque de carga que ocupa el sitio del contenido que va a llegar.
 *
 * Por qué esto y no un spinner (auditoría UX/UI 2026-08-11, D-06): un spinner
 * comunica "espera" pero no qué se espera, y al resolverse el contenido aparece
 * de golpe desplazando lo que hay debajo. El skeleton mantiene la altura, evita
 * el salto de layout y hace que la espera se perciba más corta porque la
 * estructura ya está ahí.
 *
 * El spinner sigue siendo correcto —y se mantiene— dentro de un botón mientras
 * dura una acción que el usuario acaba de lanzar: ahí sí sabe qué está pasando
 * y no hay layout que preservar.
 *
 * `aria-hidden` + el `aria-busy` del contenedor: quien usa lector de pantalla
 * no gana nada oyendo describir cajas grises.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border/60", className)}
      aria-hidden
      {...props}
    />
  );
}

/**
 * Varias líneas de texto simuladas. La última sale más corta, como termina un
 * párrafo real: un bloque perfectamente rectangular se lee como error de carga.
 */
function SkeletonTexto({
  lineas = 3,
  className,
}: {
  lineas?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lineas }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lineas - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Filas de una lista con icono o marca a la izquierda. */
function SkeletonLista({
  filas = 3,
  className,
}: {
  filas?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonTexto, SkeletonLista };
