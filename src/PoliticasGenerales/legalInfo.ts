export const VERSION = '2026-10-08';
export const FECHA_ACTUALIZACION = '8 de octubre de 2026';

// ---------- Titular (art. 10 LSSI) ----------
export const TITULAR = {
  // Persona física: nombre y apellidos. Sociedad: razón social.
  nombre: 'Pascual Damián Torregrosa Baño',
  nif: '29059486K',
  domicilio: 'Calle Estación, 29, 5°C. 30500. Molina de Segura. MURCIA',
  email: 'quintadeargos@gmail.com',
  telefono: '+34 633 49 18 25',
  // Solo si es una sociedad: "Registro Mercantil de Murcia, tomo X, folio Y, hoja MU-Z". Si no, déjalo vacío.
  registroMercantil: '',
};

// ---------- Establecimiento ----------
export const ESTABLECIMIENTO = {
  nombreComercial: 'Quinta de Argos',
  direccion: 'Camino del Vizcaino, 1, 30430 Cehegín, Murcia, España',
  // Modalidad con la que está inscrita en el Instituto de Turismo de la Región de Murcia:
  // "Casa rural" (Decreto 18/2020) o "Vivienda de uso turístico" (Decreto 256/2019).
  modalidad: 'Vivienda de uso turístico, Decreto 256/2028. Número de Registro de Empresas y Actividades Turísticas con la Signatura VV.MU.2510, aprobado por Resolución del Director General del Instituto de Turismo de la Región de Murcia. Expediente 15/2021',
  // Número de inscripción en el Registro de Empresas y Actividades Turísticas de la Región de Murcia.
  numeroRegistroTurismo: 'VV.MU.2510',
  // Número de registro único de arrendamientos, si se tiene. Si no, déjalo vacío.
  numeroRegistroUnico: 'ESFCTU000030001000504636000000000000000000VV.MU.25104',
  capacidadMaxima: 6,
  web: 'https://www.quintadeargos.com',
};

// ---------- Estancias ----------
// Horarios por defecto del art. 15 del Decreto 18/2020 (casas rurales de la Región de Murcia).
export const ESTANCIA = {
  horaEntrada: '15:00',
  horaSalida: '12:00',
  antelacionMinimaHoras: 72,
  maxNoches: 30,
};

// ---------- Cancelación ----------
// Propuesta alineada con la política «Limitada» que la casa usa en Airbnb.
// ⚠️ Confirmar con el cliente antes de publicar.
export const CANCELACION = {
  reembolsoTotalDiasAntes: 14, // cancelando con 14 días o más: 100 %
  reembolsoParcialDiasAntes: 7, // entre 7 y 14 días: 50 %
  porcentajeParcial: 50, // menos de 7 días: sin reembolso
};

// ---------- Normas de la casa ----------
export const NORMAS = {
  mascotas: 'No se admiten mascotas.',
  eventos: 'No se permiten fiestas ni eventos sin autorización previa por escrito del titular.',
  fumar: 'No está permitido fumar en el interior de la vivienda.',
  // Seguro de responsabilidad civil del alojamiento (compañía y número de póliza).
  /* seguroRC: 'PENDIENTE: compañía y número de póliza del seguro de responsabilidad civil', */
};

// ---------- Resolución de litigios (Ley 7/2017) ----------
// Si el titular se adhiere a la Junta Arbitral de Consumo u otra entidad de resolución
// alternativa, pon aquí su nombre y web. Si no, déjalo vacío.
export const ENTIDAD_RESOLUCION_ALTERNATIVA = '';

// ---------- Conservación ----------
// Reservas que nunca se llegaron a pagar: se borran o anonimizan pasado este plazo.
export const MESES_CONSERVACION_RESERVAS_NO_PAGADAS = 12;

// ---------- Rutas ----------
export const RUTA_CONDICIONES = '/policy-terms';
export const RUTA_PRIVACIDAD = '/policy-privacy';

export const esPendiente = (valor: string) => valor.startsWith('PENDIENTE');