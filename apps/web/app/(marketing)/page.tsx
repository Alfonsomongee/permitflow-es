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
import { PreciosSection } from "@/components/marketing/PreciosSection";

export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <HeroSection />
      <VerticalesSection />
      <ComoFuncionaSection />
      <PreciosSection />
    </>
  );
}
