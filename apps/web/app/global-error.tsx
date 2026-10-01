"use client";

// Último recurso: falla el layout raíz. Debe incluir <html> y <body> propios.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <main role="alert" style={{ textAlign: "center", padding: "1.5rem", maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500 }}>La aplicación no ha podido cargarse</h1>
          <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>Inténtalo de nuevo en unos segundos.</p>
          <button
            onClick={reset}
            style={{ marginTop: "1rem", background: "#1B4FD8", color: "#fff", border: 0, borderRadius: 8, padding: "0.6rem 1.2rem", cursor: "pointer" }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
