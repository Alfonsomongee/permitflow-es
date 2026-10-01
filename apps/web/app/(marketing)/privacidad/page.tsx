import Link from "next/link";
import { DatoTitular, LegalPage } from "@/components/marketing/LegalPage";
import { TITULAR } from "@/content/titular";

export const metadata = {
  title: "Política de privacidad — PermitFlow ES",
  description: "Cómo tratamos los datos personales: finalidades, base jurídica, encargados del tratamiento y derechos.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage titulo="Política de privacidad">
      <p>
        Esta política explica qué datos personales trata PermitFlow ES, para qué, con qué base jurídica y cuáles son tus
        derechos, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).
      </p>

      <h2>Responsable del tratamiento</h2>
      <ul>
        <li>Responsable: <DatoTitular valor={TITULAR.razonSocial} /> (NIF <DatoTitular valor={TITULAR.nif} />)</li>
        <li>Domicilio: <DatoTitular valor={TITULAR.domicilio} /></li>
        <li>Contacto en materia de privacidad: <DatoTitular valor={TITULAR.emailPrivacidad} /></li>
      </ul>

      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Cuenta y organización</strong> (nombre, correo, organización, rol): para crear y gestionar tu cuenta y
          prestar el servicio. Base jurídica: ejecución del contrato.
        </li>
        <li>
          <strong>Expedientes</strong> (tipo y parámetros técnicos de la instalación, comunidad autónoma, referencia del
          cliente, notas, estado de los trámites): para generar y seguir los planes de tramitación. Base: ejecución del
          contrato. Si introduces datos de terceros (tus clientes), actúas como responsable y nosotros como encargado del
          tratamiento.
        </li>
        <li>
          <strong>Documentos del portal de cliente</strong>: los archivos que sube el titular de la instalación a través del
          enlace que le facilitas. Solo los ve tu organización.
        </li>
        <li>
          <strong>Simulador de ahorro</strong> (facturas en PDF o consumos CSV): se extraen consumo, potencia y CUPS. El CUPS
          se guarda únicamente cifrado (huella HMAC), no en claro. Si la extracción automática falla, se envía a un
          proveedor de inteligencia artificial el texto de la factura <em>tras eliminar</em> teléfono, correo, IBAN,
          documentos de identidad y códigos postales detectados; el nombre y la dirección postal pueden no detectarse.
          Evita subir facturas con datos que no quieras compartir.
        </li>
        <li>
          <strong>Formulario de contacto</strong> (nombre, correo, teléfono, empresa, mensaje): para atender tu consulta.
          Base: consentimiento / interés legítimo en responder.
        </li>
        <li>
          <strong>Alertas del BOE por correo</strong> (correo electrónico): para enviarte avisos normativos. Base:
          consentimiento, que puedes retirar en cualquier momento.
        </li>
        <li>
          <strong>Asistente normativo</strong>: tus mensajes y el contexto del expediente abierto se procesan para
          responderte y se guardan para recuperar la conversación. No compartas datos personales innecesarios en el chat.
        </li>
        <li>
          <strong>Analítica de producto</strong>: eventos de uso agregados (por ejemplo, «expediente creado») sin
          grabación de pantalla ni contenido de formularios. No se activa en los enlaces del portal de cliente.
        </li>
        <li>
          <strong>Pagos</strong>: los gestiona Stripe; no almacenamos datos completos de tarjeta.
        </li>
      </ul>

      <h2>Encargados del tratamiento y transferencias</h2>
      <p>Para prestar el servicio usamos proveedores que tratan datos por cuenta del responsable:</p>
      <ul>
        <li>Clerk (autenticación y organizaciones).</li>
        <li>Supabase (base de datos y almacenamiento de archivos).</li>
        <li>Vercel y Railway (alojamiento de la aplicación y del motor).</li>
        <li>Stripe (cobros y facturación de suscripciones).</li>
        <li>Resend (envío de correo transaccional).</li>
        <li>PostHog, servidores de la UE (analítica de producto).</li>
        <li>Google (geocodificación y autocompletado de direcciones).</li>
        <li>
          DeepSeek (modelo de lenguaje del asistente y de la extracción de facturas). Este proveedor puede tratar datos
          fuera del Espacio Económico Europeo; la transferencia se ampara en las garantías que el responsable debe
          documentar antes de su uso (cláusulas contractuales tipo u otro mecanismo del capítulo V del RGPD).
        </li>
      </ul>

      <h2>Conservación</h2>
      <p>
        Conservamos los datos mientras mantengas la cuenta y, después, durante los plazos de prescripción de las
        obligaciones legales aplicables. Los estudios del simulador y las conversaciones pueden eliminarse a petición tuya.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a{" "}
        <DatoTitular valor={TITULAR.emailPrivacidad} />. Si consideras que no hemos atendido tu solicitud, puedes
        reclamar ante la Agencia Española de Protección de Datos (aepd.es).
      </p>

      <h2>Cookies</h2>
      <p>
        La aplicación usa las cookies técnicas necesarias para la sesión y la seguridad (autenticación). La analítica de
        producto no almacena identificadores persistentes en tu navegador.
      </p>

      <p>
        Consulta también el <Link href="/aviso-legal" className="text-primary hover:underline">aviso legal</Link> y los{" "}
        <Link href="/terminos" className="text-primary hover:underline">términos de servicio</Link>.
      </p>
    </LegalPage>
  );
}
