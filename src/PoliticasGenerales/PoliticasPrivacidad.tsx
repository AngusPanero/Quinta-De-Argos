import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { Dato, type LegalSection } from './LegalPage';
import { ESTABLECIMIENTO, MESES_CONSERVACION_RESERVAS_NO_PAGADAS, RUTA_CONDICIONES, TITULAR } from './legalInfo';

interface Finalidad {
  finalidad: string;
  datos: string;
  base: string;
  plazo: string;
}

const FINALIDADES: Finalidad[] = [
  {
    finalidad: 'Gestionar la reserva y la estancia (confirmación, instrucciones de llegada, atención durante la estancia)',
    datos: 'Nombre, email, teléfono, fechas, número de huéspedes y adicionales',
    base: 'Ejecución del contrato (art. 6.1.b RGPD)',
    plazo: 'Durante la relación contractual y, después, mientras puedan derivarse responsabilidades (en general, 5 años)',
  },
  {
    finalidad: 'Cobrar la reserva y prevenir el fraude en los pagos',
    datos: 'Importe, nombre, email y dirección de facturación. Los datos de la tarjeta los trata directamente Stripe',
    base: 'Ejecución del contrato (art. 6.1.b) e interés legítimo en prevenir el fraude (art. 6.1.f)',
    plazo: 'Lo exigido por la normativa contable y fiscal',
  },
  {
    finalidad: 'Emitir la factura y cumplir las obligaciones fiscales y contables',
    datos: 'Nombre o razón social, NIF/NIE/CIF o documento extranjero, dirección e importes',
    base: 'Obligación legal (art. 6.1.c): Ley 58/2003 General Tributaria, Real Decreto 1619/2012 y Código de Comercio',
    plazo: '6 años (art. 30 del Código de Comercio) y, en todo caso, el plazo de prescripción tributaria',
  },
  {
    finalidad: 'Registro documental de viajeros y comunicación al Ministerio del Interior',
    datos:
      'Los exigidos por el Real Decreto 933/2021: identidad, documento, nacionalidad, fecha de nacimiento, domicilio, contacto, relación de parentesco con menores y datos del contrato y del pago',
    base: 'Obligación legal (art. 6.1.c): Ley Orgánica 4/2015 de protección de la seguridad ciudadana y Real Decreto 933/2021',
    plazo: '3 años, como establece el Real Decreto 933/2021',
  },
  {
    finalidad: 'Atender consultas, incidencias y reclamaciones',
    datos: 'Datos de contacto y contenido de la comunicación',
    base: 'Ejecución del contrato (art. 6.1.b) y obligación legal en materia de consumo (art. 6.1.c)',
    plazo: 'Hasta su resolución y, después, mientras puedan derivarse responsabilidades',
  },
  {
    finalidad: 'Guardar la prueba de que se aceptaron las condiciones y se informó de esta política',
    datos: 'Casillas marcadas, versión del texto, fecha y hora, dirección IP y navegador',
    base: 'Obligación legal de poder demostrarlo (arts. 5.2 y 7.1 RGPD) e interés legítimo (art. 6.1.f)',
    plazo: 'Mientras se conserve la reserva',
  },
  {
    finalidad: 'Enviar ofertas y novedades de Quinta de Argos por correo electrónico',
    datos: 'Nombre y email',
    base: 'Consentimiento (art. 6.1.a RGPD y art. 21 LSSI-CE), solo si se marcó la casilla correspondiente',
    plazo: 'Hasta que se retire el consentimiento',
  },
  {
    finalidad: 'Mantener la seguridad y el funcionamiento técnico del sitio web',
    datos: 'Dirección IP, navegador y registros técnicos del servidor',
    base: 'Interés legítimo en proteger el servicio (art. 6.1.f)',
    plazo: 'Periodos cortos, salvo que sean necesarios para investigar un incidente',
  },
];

interface Proveedor {
  nombre: string;
  servicio: string;
  ubicacion: string;
}

const PROVEEDORES: Proveedor[] = [
  {
    nombre: 'Stripe',
    servicio:
      'Procesamiento de pagos. Para la prevención del fraude y el cumplimiento de la normativa financiera actúa como responsable independiente, según su propia política de privacidad',
    ubicacion: 'UE y EE. UU.',
  },
  { nombre: 'Beds24', servicio: 'Gestión de reservas y sincronización de disponibilidad del alojamiento', ubicacion: 'Según su contrato de encargo' },
  { nombre: 'MongoDB Atlas', servicio: 'Base de datos de las reservas', ubicacion: 'Según la región contratada' },
  { nombre: 'Render', servicio: 'Alojamiento del servidor y de la web', ubicacion: 'EE. UU. / UE' },
  { nombre: 'Cloudflare', servicio: 'Gestión del dominio y seguridad de la web', ubicacion: 'Red global' },
  { nombre: 'Brevo', servicio: 'Envío de correos electrónicos de la reserva', ubicacion: 'UE' },
];

const secciones: LegalSection[] = [
  {
    id: 'responsable',
    titulo: 'Responsable del tratamiento',
    contenido: (
      <>
        <dl className="legal-dl">
          <dt>Responsable</dt>
          <dd>
            <Dato valor={TITULAR.nombre} />
          </dd>
          <dt>NIF</dt>
          <dd>
            <Dato valor={TITULAR.nif} />
          </dd>
          <dt>Domicilio</dt>
          <dd>
            <Dato valor={TITULAR.domicilio} />
          </dd>
          <dt>Correo electrónico</dt>
          <dd>
            <Dato valor={TITULAR.email} />
          </dd>
          <dt>Teléfono</dt>
          <dd>
            <Dato valor={TITULAR.telefono} />
          </dd>
        </dl>
        <p>
          Dada la naturaleza y el volumen del tratamiento, no se ha designado un delegado de protección de datos. Para
          cualquier cuestión sobre privacidad puedes escribir al correo indicado.
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    titulo: 'Qué datos tratamos',
    contenido: (
      <>
        <ul className="legal-list">
          <li>
            <strong>Datos de la reserva y de contacto:</strong> nombre y apellidos, correo electrónico, teléfono,
            fechas de estancia, número de huéspedes y servicios adicionales.
          </li>
          <li>
            <strong>Datos de facturación:</strong> nombre o razón social, documento (DNI, NIE, CIF, pasaporte o
            documento extranjero) y dirección.
          </li>
          <li>
            <strong>Datos del pago:</strong> importe, fecha y referencia de la operación. No recibimos ni guardamos el
            número completo de la tarjeta: lo trata directamente Stripe.
          </li>
          <li>
            <strong>Datos del registro de viajeros:</strong> los que exige el Real Decreto 933/2021 a todos los
            huéspedes, que se solicitan antes de la llegada.
          </li>
          <li>
            <strong>Prueba de aceptación:</strong> qué casillas se marcaron, la versión del texto aceptado, la fecha y
            hora, la dirección IP y el navegador utilizado.
          </li>
          <li>
            <strong>Comunicaciones:</strong> los mensajes que intercambiemos contigo.
          </li>
        </ul>
        <p>
          Todos los datos marcados como obligatorios en el formulario son necesarios para formalizar la reserva,
          cobrarla, facturarla y cumplir las obligaciones legales del alojamiento. Si no se facilitan, no es posible
          completar la reserva. Si reservas para otras personas, debes informarles de esta política.
        </p>
        <p>
          Las reservas solo pueden hacerlas mayores de 18 años. Los datos de los huéspedes menores solo se tratan para
          cumplir el registro de viajeros y los facilita el adulto responsable.
        </p>
      </>
    ),
  },
  {
    id: 'finalidades',
    titulo: 'Para qué los usamos, con qué base legal y durante cuánto tiempo',
    contenido: (
      <>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th scope="col">Finalidad</th>
                <th scope="col">Datos</th>
                <th scope="col">Base jurídica</th>
                <th scope="col">Conservación</th>
              </tr>
            </thead>
            <tbody>
              {FINALIDADES.map((f) => (
                <tr key={f.finalidad}>
                  <th scope="row">{f.finalidad}</th>
                  <td>{f.datos}</td>
                  <td>{f.base}</td>
                  <td>{f.plazo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Las reservas que se inician pero no llegan a pagarse se eliminan o anonimizan en un plazo máximo de{' '}
          {MESES_CONSERVACION_RESERVAS_NO_PAGADAS} meses. Al terminar los plazos indicados, los datos se suprimen o se
          bloquean durante el tiempo en que puedan ser requeridos por jueces, tribunales o administraciones públicas,
          como prevé el artículo 32 de la LOPDGDD.
        </p>
        <p>
          No tomamos decisiones basadas únicamente en tratamientos automatizados que produzcan efectos jurídicos sobre
          ti. Stripe aplica sistemas automáticos de detección de fraude que, excepcionalmente, pueden rechazar un pago;
          si ocurre, puedes contactarnos y lo revisaremos.
        </p>
      </>
    ),
  },
  {
    id: 'destinatarios',
    titulo: 'A quién comunicamos los datos',
    contenido: (
      <>
        <p>No vendemos ni cedemos tus datos a terceros con fines comerciales. Solo los comunicamos a:</p>
        <ul className="legal-list">
          <li>
            <strong>Administraciones públicas</strong> cuando la ley lo exige: el Ministerio del Interior (registro de
            viajeros a través de SES.Hospedajes), la Agencia Tributaria y, en su caso, jueces y tribunales.
          </li>
          <li>
            <strong>Proveedores que nos prestan servicios</strong> necesarios para gestionar la web y las reservas,
            que acceden a los datos solo para ese fin y con contrato de encargo de tratamiento:
          </li>
        </ul>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">Servicio</th>
                <th scope="col">Ubicación del tratamiento</th>
              </tr>
            </thead>
            <tbody>
              {PROVEEDORES.map((p) => (
                <tr key={p.nombre}>
                  <th scope="row">{p.nombre}</th>
                  <td>{p.servicio}</td>
                  <td>{p.ubicacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Las plataformas en las que también se anuncia el alojamiento (como Booking.com o Airbnb) solo reciben la
          ocupación de las fechas para evitar dobles reservas, no tus datos personales.
        </p>
      </>
    ),
  },
  {
    id: 'transferencias',
    titulo: 'Transferencias internacionales',
    contenido: (
      <p>
        Algunos de los proveedores anteriores pueden tratar datos fuera del Espacio Económico Europeo, principalmente
        en Estados Unidos. En esos casos, la transferencia se ampara en garantías adecuadas previstas en el RGPD: la
        adhesión del proveedor al Marco de Privacidad de Datos UE-EE. UU. (decisión de adecuación de la Comisión
        Europea) o la firma de las cláusulas contractuales tipo aprobadas por la Comisión. Puedes solicitar más
        información sobre estas garantías en el correo de contacto.
      </p>
    ),
  },
  {
    id: 'derechos',
    titulo: 'Tus derechos',
    contenido: (
      <>
        <p>Puedes ejercer en cualquier momento, de forma gratuita, los siguientes derechos:</p>
        <ul className="legal-list">
          <li>
            <strong>Acceso:</strong> saber qué datos tuyos tratamos.
          </li>
          <li>
            <strong>Rectificación:</strong> corregir datos inexactos o incompletos.
          </li>
          <li>
            <strong>Supresión:</strong> pedir que se borren, salvo que debamos conservarlos por obligación legal.
          </li>
          <li>
            <strong>Oposición</strong> al tratamiento basado en interés legítimo, y a las comunicaciones comerciales.
          </li>
          <li>
            <strong>Limitación</strong> del tratamiento en los casos previstos en el RGPD.
          </li>
          <li>
            <strong>Portabilidad:</strong> recibir los datos que nos facilitaste en un formato estructurado.
          </li>
          <li>
            <strong>Retirar el consentimiento</strong> para comunicaciones comerciales, sin que afecte a los envíos
            anteriores. También puedes hacerlo desde el enlace de baja incluido en cada correo.
          </li>
        </ul>
        <p>
          Para ejercerlos, escribe a <Dato valor={TITULAR.email} /> indicando el derecho que quieres ejercer. Si hay
          dudas razonables sobre tu identidad, podremos pedirte información adicional para confirmarla. Responderemos
          en el plazo de un mes, ampliable en dos meses más en casos complejos, como prevé el RGPD.
        </p>
        <p>
          Si consideras que no hemos atendido correctamente tu solicitud, puedes presentar una reclamación ante la{' '}
          <strong>Agencia Española de Protección de Datos</strong> (C/ Jorge Juan, 6, 28001 Madrid ·{' '}
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
            www.aepd.es
          </a>
          ).
        </p>
      </>
    ),
  },
  {
    id: 'seguridad',
    titulo: 'Seguridad',
    contenido: (
      <p>
        Aplicamos medidas técnicas y organizativas adecuadas para proteger los datos: conexión cifrada (HTTPS) en todo
        el sitio, pagos a través de una pasarela certificada, acceso al panel de gestión restringido a personas
        autorizadas con autenticación, y envío a cada proveedor solo de los datos imprescindibles para su servicio.
      </p>
    ),
  },
  {
    id: 'cookies',
    titulo: 'Cookies y almacenamiento en el navegador',
    contenido: (
      <>
        <p>
          Este sitio web solo utiliza cookies y almacenamiento local de carácter técnico, necesarios para que funcione
          el servicio que solicitas, por lo que están exentos de consentimiento según el artículo 22.2 de la LSSI-CE:
        </p>
        <ul className="legal-list">
          <li>Almacenamiento de la sesión del navegador para no perder la reserva en curso si recargas la página.</li>
          <li>Preferencia de tema claro u oscuro.</li>
          <li>Cookies de Stripe necesarias para procesar el pago de forma segura y prevenir el fraude.</li>
        </ul>
        <p>
          No utilizamos cookies analíticas ni publicitarias. Si en el futuro se incorporan, se pedirá tu
          consentimiento previo y se actualizará esta política.
        </p>
      </>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios en esta política',
    contenido: (
      <p>
        Podemos actualizar esta política para adaptarla a cambios legales o del servicio. La versión y la fecha de
        actualización figuran al principio de la página, y en cada reserva queda registrada la versión vigente en ese
        momento. Las condiciones de contratación están en la página de{' '}
        <Link to={RUTA_CONDICIONES}>condiciones de reserva</Link>.
      </p>
    ),
  },
];

const PoliticaPrivacidad: React.FC = () => (
  <LegalPage
    eyebrow="Información legal"
    titulo="Política de privacidad"
    intro={
      <p>
        En {ESTABLECIMIENTO.nombreComercial} tratamos tus datos con el mismo cuidado que la casa: solo los
        imprescindibles, para lo que los necesitamos y durante el tiempo que exige la ley. Aquí te explicamos, conforme
        al Reglamento General de Protección de Datos (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD), qué datos tratamos,
        para qué y cuáles son tus derechos.
      </p>
    }
    secciones={secciones}
  />
);

export default PoliticaPrivacidad;