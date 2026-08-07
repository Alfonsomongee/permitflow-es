// D-10 (auditoría 2026-08-06): cabeceras de seguridad HTTP. Antes no había
// ninguna -- next.config.mjs estaba vacío.
//
// CSP en modo Report-Only a propósito: este entorno no tiene acceso al
// despliegue real (dominio de Clerk en producción, proyecto de Supabase
// concreto, etc.), así que no se ha podido verificar contra el sitio en
// vivo. Un CSP mal ajustado en modo "enforce" puede romper el login de
// TODOS los visitantes (Clerk) en silencio. Antes de pasar a
// Content-Security-Policy (enforced), revisa los reportes de violación en
// la consola del navegador durante unos días con tráfico real y ajusta los
// dominios de connect-src/script-src que falten.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Clerk inyecta scripts inline pequeños de bootstrap; 'unsafe-inline' en
  // script-src es una concesión conocida de Clerk (ver su documentación de
  // CSP) mientras no se migra a nonces.
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.supabase.co https://api.stripe.com",
  "frame-src 'self' https://challenges.cloudflare.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS: solo tiene efecto servido sobre HTTPS (Vercel/Railway ya fuerzan
  // HTTPS delante), no rompe nada en local sobre http://.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
