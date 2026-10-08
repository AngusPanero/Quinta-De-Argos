import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { Dato, type LegalSection } from './LegalPage';
import {
  CANCELACION,
  ENTIDAD_RESOLUCION_ALTERNATIVA,
  ESTABLECIMIENTO,
  ESTANCIA,
  NORMAS,
  RUTA_PRIVACIDAD,
  TITULAR,
} from './legalInfo';

/**
 * CondicionesReserva — /condiciones-reserva
 * ---------------------------------------------------------
 * Aviso legal + condiciones generales de contratación de las
 * reservas hechas en quintadeargos.com.
 *
 * Normativa tenida en cuenta:
 * - Ley 34/2002 (LSSI-CE): identificación del titular (art. 10) e
 *   información del proceso de contratación electrónica (art. 27).
 * - Real Decreto Legislativo 1/2007 (TRLGDCU): información
 *   precontractual (art. 97) y excepción al desistimiento (art. 103.l).
 * - Ley 12/2013 de Turismo de la Región de Murcia, Decreto 18/2020
 *   (casas rurales) y Decreto 256/2019 (viviendas de uso turístico).
 * - Real Decreto 933/2021 (registro documental de viajeros).
 * - Ley 7/2017 (resolución alternativa de litigios de consumo).
 */

const secciones: LegalSection[] = [
  {
    id: 'titular',
    titulo: 'Titular del sitio web y del alojamiento',
    contenido: (
      <>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de
          comercio electrónico (LSSI-CE), se informa de los datos del titular de este sitio web y del alojamiento:
        </p>
        <dl className="legal-dl">
          <dt>Titular</dt>
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
          {TITULAR.registroMercantil && (
            <>
              <dt>Datos registrales</dt>
              <dd>{TITULAR.registroMercantil}</dd>
            </>
          )}
          <dt>Establecimiento</dt>
          <dd>
            {ESTABLECIMIENTO.nombreComercial} · <Dato valor={ESTABLECIMIENTO.direccion} />
          </dd>
          <dt>Modalidad</dt>
          <dd>
            <Dato valor={ESTABLECIMIENTO.modalidad} />
          </dd>
          <dt>Nº de registro turístico</dt>
          <dd>
            <Dato valor={ESTABLECIMIENTO.numeroRegistroTurismo} /> (Registro de Empresas y Actividades Turísticas de
            la Región de Murcia)
          </dd>
          {ESTABLECIMIENTO.numeroRegistroUnico && (
            <>
              <dt>Nº de registro único</dt>
              <dd>{ESTABLECIMIENTO.numeroRegistroUnico}</dd>
            </>
          )}
          <dt>Sitio web</dt>
          <dd>{ESTABLECIMIENTO.web}</dd>
        </dl>
      </>
    ),
  },
  {
    id: 'objeto',
    titulo: 'Objeto y aceptación',
    contenido: (
      <>
        <p>
          Estas condiciones regulan el uso del sitio web {ESTABLECIMIENTO.web} y la contratación de estancias en{' '}
          {ESTABLECIMIENTO.nombreComercial} a través de él. Se entiende por «Cliente» la persona que realiza la reserva
          y por «Huéspedes» todas las personas que se alojan.
        </p>
        <p>
          Para reservar es necesario leer y aceptar expresamente estas condiciones marcando la casilla
          correspondiente antes del pago. La versión aceptada queda registrada junto con la reserva y es la que se
          aplica a esa estancia, aunque estas condiciones se modifiquen después.
        </p>
        <p>Solo pueden realizar reservas personas mayores de 18 años con capacidad legal para contratar.</p>
      </>
    ),
  },
  {
    id: 'alojamiento',
    titulo: 'El alojamiento',
    contenido: (
      <>
        <p>
          {ESTABLECIMIENTO.nombreComercial} es una finca situada en Cehegín (Región de Murcia) que se alquila{' '}
          <strong>completa y de uso exclusivo</strong> para cada reserva: no se comparte con otros huéspedes ni con el
          titular. Su capacidad máxima es de <strong>{ESTABLECIMIENTO.capacidadMaxima} personas</strong>, que no puede
          superarse en ningún caso, incluidos los menores.
        </p>
        <p>
          El precio incluye el uso de la vivienda y de sus espacios exteriores, los suministros (agua, electricidad,
          calefacción y agua caliente) y la ropa de cama y de baño. Las fotografías y descripciones del sitio web
          reflejan fielmente el alojamiento; los elementos decorativos pueden variar ligeramente.
        </p>
      </>
    ),
  },
  {
    id: 'reserva',
    titulo: 'Proceso de reserva',
    contenido: (
      <>
        <p>La reserva se realiza íntegramente en este sitio web, en español, siguiendo estos pasos:</p>
        <ol className="legal-list">
          <li>Elección de fechas y número de huéspedes en el calendario, que solo permite seleccionar noches disponibles.</li>
          <li>Elección, si se desea, de servicios adicionales.</li>
          <li>
            Revisión del resumen de la reserva. Antes de pagar, el Cliente puede modificar las fechas, los huéspedes y
            los adicionales, y corregir cualquier dato introducido.
          </li>
          <li>Introducción de los datos de contacto y de facturación.</li>
          <li>Aceptación de estas condiciones y de la política de privacidad, y pago.</li>
        </ol>
        <p>Reglas de reserva:</p>
        <ul className="legal-list">
          <li>
            Antelación mínima de <strong>{ESTANCIA.antelacionMinimaHoras} horas</strong>. Para fechas más próximas,
            consulta disponibilidad directamente con el titular.
          </li>
          <li>
            Estancia mínima variable según la fecha de llegada (se indica en el calendario al elegirla) y estancia
            máxima de {ESTANCIA.maxNoches} noches por reserva.
          </li>
        </ul>
        <p>
          El contrato se considera celebrado cuando el pago se confirma. En ese momento se muestra en pantalla la
          confirmación con el código de reserva y se envía por correo electrónico. El titular conserva el documento
          electrónico de la reserva, al que el Cliente puede acceder solicitándolo en el correo de contacto.
        </p>
        <p>
          Si entre la consulta y el pago las fechas dejaran de estar disponibles o el precio cambiara, el sistema lo
          avisa antes de cobrar y no se realiza ningún cargo.
        </p>
      </>
    ),
  },
  {
    id: 'precio',
    titulo: 'Precio e impuestos',
    contenido: (
      <>
        <p>
          El precio de cada noche depende de la fecha y se muestra en el calendario antes de reservar. El importe total
          que aparece antes del pago es <strong>final e incluye el IVA y todos los impuestos aplicables</strong>. No
          existen cargos adicionales no informados: los servicios adicionales solo se cobran si se eligen
          expresamente.
        </p>
        <p>
          En caso de discrepancia entre precios publicados para la misma estancia, se aplica el más favorable para el
          Cliente.
        </p>
      </>
    ),
  },
  {
    id: 'pago',
    titulo: 'Pago y factura',
    contenido: (
      <>
        <p>
          El importe total se abona en el momento de reservar mediante tarjeta u otros métodos de pago online
          disponibles en la pasarela segura de <strong>Stripe</strong>. El titular no tiene acceso ni almacena los
          datos completos de la tarjeta. Las operaciones pueden requerir autenticación reforzada (por ejemplo, 3D
          Secure) según la normativa europea de servicios de pago.
        </p>
        <p>
          La factura se emite con los datos de facturación facilitados en la reserva, a nombre de un particular o de
          una empresa, y se envía al correo electrónico indicado. Es responsabilidad del Cliente que esos datos sean
          correctos.
        </p>
      </>
    ),
  },
  {
    id: 'desistimiento',
    titulo: 'Derecho de desistimiento',
    contenido: (
      <p>
        Conforme al artículo 103, letra l), del Real Decreto Legislativo 1/2007 (Ley General para la Defensa de los
        Consumidores y Usuarios), <strong>no existe derecho de desistimiento</strong> en los contratos de alojamiento
        para fines distintos del de servir de vivienda cuando se prevé una fecha o un periodo de ejecución
        específicos, como es el caso de estas reservas. Las cancelaciones se rigen por la política del apartado
        siguiente.
      </p>
    ),
  },
  {
    id: 'cancelacion',
    titulo: 'Cancelaciones y modificaciones',
    contenido: (
      <>
        <h3 className="legal-subtitle">Cancelación por parte del Cliente</h3>
        <ul className="legal-list">
          <li>
            Con <strong>{CANCELACION.reembolsoTotalDiasAntes} días o más</strong> de antelación a la fecha de llegada:
            reembolso del 100 % del importe pagado.
          </li>
          <li>
            Entre <strong>{CANCELACION.reembolsoParcialDiasAntes} y {CANCELACION.reembolsoTotalDiasAntes - 1} días</strong>{' '}
            antes de la llegada: reembolso del {CANCELACION.porcentajeParcial} %.
          </li>
          <li>
            Con <strong>menos de {CANCELACION.reembolsoParcialDiasAntes} días</strong> de antelación, o si los huéspedes
            no se presentan: sin reembolso.
          </li>
        </ul>
        <p>
          La cancelación debe solicitarse por escrito al correo de contacto indicando el código de reserva. Cuenta la
          fecha de recepción del correo. Los reembolsos se realizan al mismo medio de pago utilizado, en un plazo
          máximo de 14 días naturales.
        </p>
        <p>
          Una salida anticipada o una llegada posterior a la fecha reservada no da derecho a reembolso de las noches no
          disfrutadas.
        </p>

        <h3 className="legal-subtitle">Modificaciones</h3>
        <p>
          Los cambios de fechas o de número de huéspedes se pueden solicitar por correo electrónico y quedan sujetos a
          disponibilidad y a la diferencia de precio que corresponda.
        </p>

        <h3 className="legal-subtitle">Cancelación por parte del titular</h3>
        <p>
          Si por causa de fuerza mayor o cualquier circunstancia ajena a la voluntad del Cliente el alojamiento no
          pudiera ofrecerse en las condiciones contratadas, el titular lo comunicará lo antes posible y reembolsará
          íntegramente las cantidades pagadas.
        </p>
      </>
    ),
  },
  {
    id: 'llegada',
    titulo: 'Llegada, salida y registro de viajeros',
    contenido: (
      <>
        <p>
          La entrada es a partir de las <strong>{ESTANCIA.horaEntrada} h</strong> del día de llegada y la salida, antes
          de las <strong>{ESTANCIA.horaSalida} h</strong> del día de salida, salvo acuerdo distinto con el titular. Las
          instrucciones de llegada se envían por correo electrónico antes de la estancia.
        </p>
        <p>
          El Real Decreto 933/2021 obliga al titular a registrar a todos los huéspedes y a comunicar sus datos al
          Ministerio del Interior. Por ello, antes de entrar, cada huésped deberá facilitar su documento de identidad
          o pasaporte y los datos que exige esta norma (en el caso de los menores, los facilita el adulto responsable).
          Sin este registro no es posible acceder al alojamiento, sin que ello dé derecho a reembolso.
        </p>
      </>
    ),
  },
  {
    id: 'normas',
    titulo: 'Normas de la casa',
    contenido: (
      <ul className="legal-list">
        <li>
          No se puede superar la capacidad máxima de {ESTABLECIMIENTO.capacidadMaxima} personas ni alojar a personas
          no incluidas en la reserva.
        </li>
        <li>{NORMAS.eventos}</li>
        <li>Debe respetarse el descanso de los vecinos y del entorno, especialmente entre las 23:00 y las 8:00 h.</li>
        <li>{NORMAS.fumar}</li>
        <li>
          Mascotas: <Dato valor={NORMAS.mascotas} />
        </li>
        <li>
          La piscina no dispone de socorrista. Su uso es responsabilidad de los huéspedes y los menores deben estar
          siempre bajo la vigilancia de un adulto.
        </li>
        <li>
          Los huéspedes deben usar la vivienda, el mobiliario y el equipamiento con la diligencia debida y dejarlos en
          el estado en que los encontraron.
        </li>
      </ul>
    ),
  },
  {
    id: 'responsabilidad',
    titulo: 'Responsabilidad',
    contenido: (
      <>
        <p>
          El Cliente responde de los daños que él o los huéspedes de su reserva causen intencionadamente o por
          negligencia en la vivienda, su contenido o el resto de la finca, y del incumplimiento de las normas de la
          casa. El titular podrá reclamar el coste de reparación o reposición debidamente justificado.
        </p>
        <p>
          El titular no se hace responsable de la pérdida o el deterioro de objetos personales de los huéspedes, salvo
          que se deba a su culpa o negligencia, ni de interrupciones de suministros ajenas a su control, que
          procurará resolver con la mayor rapidez posible.
        </p>
        <p>
          El alojamiento cuenta con seguro de responsabilidad civil: <Dato valor={NORMAS.seguroRC} />.
        </p>
      </>
    ),
  },
  {
    id: 'reclamaciones',
    titulo: 'Atención al cliente y hojas de reclamaciones',
    contenido: (
      <>
        <p>
          Cualquier consulta, incidencia o reclamación puede dirigirse al correo <Dato valor={TITULAR.email} /> o al
          teléfono <Dato valor={TITULAR.telefono} />, indicando el código de reserva. El titular confirmará la
          recepción y responderá lo antes posible y, en todo caso, en un plazo máximo de 15 días hábiles.
        </p>
        <p>
          El alojamiento dispone de <strong>hojas de reclamaciones</strong> oficiales de la Región de Murcia a
          disposición de los huéspedes, y su existencia se anuncia en el propio alojamiento. Las reclamaciones pueden
          presentarse también ante los servicios de consumo de la Región de Murcia.
        </p>
      </>
    ),
  },
  {
    id: 'litigios',
    titulo: 'Resolución de conflictos y ley aplicable',
    contenido: (
      <>
        <p>
          Estas condiciones se rigen por la legislación española. Las partes procurarán resolver de forma amistosa
          cualquier discrepancia.
        </p>
        {ENTIDAD_RESOLUCION_ALTERNATIVA ? (
          <p>
            El titular está adherido a la siguiente entidad de resolución alternativa de litigios de consumo, a la que
            el Cliente puede acudir: {ENTIDAD_RESOLUCION_ALTERNATIVA}.
          </p>
        ) : (
          <p>
            El titular no está adherido a ninguna entidad de resolución alternativa de litigios de consumo. El Cliente
            puede presentar su reclamación ante los servicios de consumo de la Región de Murcia o de su lugar de
            residencia.
          </p>
        )}
        <p>
          Cuando el Cliente sea consumidor, serán competentes los juzgados y tribunales de su domicilio, conforme a la
          normativa de protección de los consumidores.
        </p>
      </>
    ),
  },
  {
    id: 'web',
    titulo: 'Uso del sitio web y propiedad intelectual',
    contenido: (
      <>
        <p>
          Los textos, fotografías, diseño, logotipos y código de este sitio web son propiedad del titular o se usan con
          autorización, y están protegidos por la normativa de propiedad intelectual e industrial. No se permite su
          reproducción o uso comercial sin autorización expresa.
        </p>
        <p>
          El usuario se compromete a hacer un uso lícito del sitio web y a no introducir datos falsos ni de terceros
          sin su consentimiento. El tratamiento de los datos personales se explica en la{' '}
          <Link to={RUTA_PRIVACIDAD}>política de privacidad</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'modificaciones',
    titulo: 'Modificación de estas condiciones',
    contenido: (
      <p>
        El titular puede actualizar estas condiciones. Cada versión indica su fecha y número al principio de la
        página, y a cada reserva se le aplica la versión vigente en el momento en que se realizó, que queda registrada
        junto con ella. Las estancias reservadas con anterioridad no se ven afectadas por los cambios.
      </p>
    ),
  },
];

const CondicionesReserva: React.FC = () => (
  <LegalPage
    eyebrow="Información legal"
    titulo="Condiciones de reserva"
    intro={
      <p>
        Aviso legal y condiciones generales de contratación de las estancias en {ESTABLECIMIENTO.nombreComercial}.
        Te recomendamos leerlas con calma antes de reservar: te explican qué incluye tu estancia, cómo se paga, qué
        ocurre si necesitas cancelar y cuáles son las normas de la casa.
      </p>
    }
    secciones={secciones}
  />
);

export default CondicionesReserva;