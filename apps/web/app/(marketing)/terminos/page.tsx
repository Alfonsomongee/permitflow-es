import Link from "next/link";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Términos de servicio — PermitFlow ES",
  description: "Condiciones de uso del servicio, planes, pagos y limitaciones de responsabilidad.",
};

export default function TerminosPage() {
  return (
    <LegalPage titulo="Términos de servicio">
      <p>
        Estos términos regulan el uso de PermitFlow ES por parte de empresas y profesionales (instaladoras, gestorías y
        técnicos). Al crear una cuenta los aceptas.
      </p>

      <h2>El servicio</h2>
      <p>
        PermitFlow ES clasifica los trámites administrativos de una instalación según la normativa estatal y autonómica
        recogida en su motor, genera documentación de apoyo y permite seguir el estado de cada expediente.
      </p>

      <h2>Naturaleza orientativa de la información</h2>
      <p>
        El plan de tramitación, los plazos, los costes y las ayudas son estimaciones basadas en normativa que se revisa
        periódicamente. Cada resultado muestra el nivel de verificación de su fuente; cuando es «borrador» o «verificación
        parcial», debes contrastarlo con el organismo competente antes de presentar. La responsabilidad profesional sobre
        el proyecto, la memoria técnica y la presentación sigue siendo del técnico o la empresa que los firma.
      </p>

      <h2>Planes y pagos</h2>
      <p>
        El plan Free incluye un número limitado de clasificaciones al mes. El plan Pro se contrata mediante suscripción
        mensual a través de Stripe, se renueva automáticamente y puede cancelarse en cualquier momento desde Ajustes; la
        cancelación surte efecto al final del periodo ya pagado. Los precios se muestran sin IVA.
      </p>

      <h2>Uso aceptable</h2>
      <ul>
        <li>No intentar acceder a datos de otras organizaciones ni eludir los límites del servicio.</li>
        <li>No subir contenido ilícito ni datos de terceros sin base legitimadora para hacerlo.</li>
        <li>Mantener la confidencialidad de las credenciales y de los enlaces del portal de cliente.</li>
      </ul>

      <h2>Disponibilidad y cambios</h2>
      <p>
        Trabajamos para mantener el servicio disponible, pero no garantizamos un funcionamiento ininterrumpido. Podemos
        modificar el servicio y estos términos; los cambios relevantes se comunicarán con antelación razonable.
      </p>

      <h2>Limitación de responsabilidad</h2>
      <p>
        En la medida permitida por la ley, el titular no responde de los daños indirectos derivados del uso de la
        información, ni de retrasos, denegaciones o sanciones impuestas por organismos en procedimientos tramitados con
        apoyo de la herramienta.
      </p>

      <p>
        Más información en el <Link href="/aviso-legal" className="text-primary hover:underline">aviso legal</Link> y la{" "}
        <Link href="/privacidad" className="text-primary hover:underline">política de privacidad</Link>.
      </p>
    </LegalPage>
  );
}
