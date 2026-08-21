import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Antes solo cubría 3 carpetas (calculations/parsing/schemas), una
      // selección de hace tiempo que ya no representaba dónde vive el código
      // con tests reales -- y sin `all: true`, v8 solo reporta los ficheros
      // que un test llega a importar, así que un fichero sin NINGÚN test
      // (p.ej. lib/expedientes.ts, la capa de acceso a datos multi-tenant)
      // simplemente no aparecía en el informe en vez de aparecer al 0%.
      // Comprobado de forma empírica el 2026-08-20: con la config anterior,
      // ficheros con tests reales que pasan (economic-projection.ts,
      // numbers.ts, simulador.ts, incentivos-regionales.ts) tampoco salían
      // en el informe por no matchear el glob.
      // v4 de @vitest/coverage-v8 ya reporta como 0% cualquier fichero que
      // matchee `include` aunque ningún test lo toque -- no existe (ni hace
      // falta) la opción `all` de versiones anteriores.
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts"],
    },
  },
});
