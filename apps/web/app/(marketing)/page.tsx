/**
 * apps/web/app/(marketing)/page.tsx
 *
 * Landing page pública de PermitFlow ES.
 * Ruta: /
 */
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HeroSection } from "@/components/marketing/HeroSection";
import { VerticalesSection } from "@/components/marketing/VerticalesSection";
import { ComoFuncionaSection } from "@/components/marketing/ComoFuncionaSection";

export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <HeroSection />
      <VerticalesSection />
      <ComoFuncionaSection />
    </>
  );
}
