# Tareas Pendientes: Simulador Frontend

- [x] **Setup y Dependencias Frontend**
  - [x] Instala `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `framer-motion`, `recharts`.
  - [x] Usa `npx shadcn-ui@latest add slider tabs progress accordion` para instalar los componentes requeridos.

- [x] **Interfaz Frontend (Simulador y Resultados)**
  - [x] Completa/Crea `apps/web/app/(dashboard)/simulador/page.tsx` con el Wizard multi-paso (subida de factura, selección de parámetros, etc).
  - [x] Implementa el rechazo de archivos JPG/PNG explícitamente en el componente de subida, mostrando un mensaje que guíe al usuario a descargar el PDF desde el área de cliente de Iberdrola/Endesa/Naturgy.
  - [x] Crea `apps/web/components/simulador/InformeInteractivo.tsx` con gráficos (usa `recharts`) y controles dinámicos. Asegúrate de mostrar claramente los avisos legales (`supuestos_utilizados`) y advertir si los datos provienen de deducciones "no verificadas" (estado `generica_pendiente_url`).
