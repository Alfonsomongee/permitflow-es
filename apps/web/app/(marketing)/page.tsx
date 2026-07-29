/**
 * apps/web/app/(marketing)/page.tsx
 *
 * Landing page pública de PermitFlow ES.
 * Ruta: /
 */
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HeroSection } from "@/components/marketing/HeroSection";
import { TechStackMarquee } from "@/components/marketing/TechStackMarquee";
import { QuienesSomosSection } from "@/components/marketing/QuienesSomosSection";
import { VerticalesSection } from "@/components/marketing/VerticalesSection";
import { ComoFuncionaSection } from "@/components/marketing/ComoFuncionaSection";
import { PreciosSection } from "@/components/marketing/PreciosSection";
import { Footer } from "@/components/marketing/Footer";

export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <HeroSection />
      <TechStackMarquee />
      <QuienesSomosSection />
      <VerticalesSection />
      <ComoFuncionaSection />
      <PreciosSection />
      <Footer />
    </>
  );
}
