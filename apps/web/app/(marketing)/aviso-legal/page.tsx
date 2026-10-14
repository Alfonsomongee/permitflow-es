import { DatoTitular, LegalPage } from "@/components/marketing/LegalPage";
import { TITULAR } from "@/content/titular";

export const metadata = {
  title: "Aviso legal — PermitFlow ES",
  description: "Datos identificativos del titular del servicio y condiciones generales de uso del sitio web.",
};

export default function AvisoLegalPage() {
  return (
    <LegalPage titulo="Aviso legal">
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio
        Electrónico (LSSI-CE), se facilitan los datos identificativos del titular de este sitio web.
      </p>

      <h2>Titular</h2>
      <ul>
        <li>Razón social: <DatoTitular valor={TITULAR.razonSocial} /></li>
        <li>NIF: <DatoTitular valor={TITULAR.nif} /></li>
        <li>Domicilio: <DatoTitular valor={TITULAR.domicilio} /></li>
        <li>Inscripción registral: <DatoTitular valor={TITULAR.registroMercantil} /></li>
        <li>Correo electrónico de contacto: <DatoTitular valor={TITULAR.emailContacto} /></li>
      </ul>

      <h2>Objeto</h2>
      <p>
        PermitFlow ES es una herramienta de apoyo a la tramitación administrativa de instalaciones técnicas (fotovoltaica,
        recarga de vehículo eléctrico, climatización, ACS y gas). La información que ofrece es <strong>orientativa</strong>:
        no sustituye al asesoramiento de un técnico competente ni a la consulta del organismo que tramita cada expediente.
        Cada plan de tramitación indica el nivel de verificación de la normativa en la que se basa; los planes basados en
        contenido en borrador deben contrastarse con el organismo antes de presentar cualquier solicitud.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        El titular no responde de las decisiones adoptadas a partir de la información del servicio ni de los plazos y
        costes estimados, que pueden variar según el organismo, la comunidad autónoma o cambios normativos posteriores. Se
        procura mantener la información actualizada, pero no se garantiza su exhaustividad.
      </p>

      <h2>Propiedad intelectual</h2>
      <p>
        El código, el diseño y los contenidos propios del servicio son titularidad del titular o se utilizan con licencia.
        Las normas y textos oficiales citados pertenecen a sus respectivos organismos y se enlazan a su fuente.
      </p>

      <h2>Legislación aplicable</h2>
      <p>Este aviso se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a la ley.</p>
    </LegalPage>
  );
}
