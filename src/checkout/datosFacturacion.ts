/**
 * datosFacturacion.ts — Quinta de Argos
 * ---------------------------------------------------------
 * Tipos, países y validación de documentos para el formulario
 * de facturación del checkout. Es solo para avisar al usuario
 * mientras escribe: el backend (services/validacionFiscal.js)
 * vuelve a validarlo todo antes de guardar la reserva.
 */

export type TipoFacturacion = 'particular' | 'empresa';
export type TipoDocumento = 'NIF' | 'NIE' | 'CIF' | 'PASAPORTE' | 'ID_EXTRANJERO';

export interface DireccionFacturacion {
  linea1: string;
  linea2: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string; // ISO 3166-1 alfa-2
}

export interface DatosFacturacion {
  tipo: TipoFacturacion;
  nombre: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  direccion: DireccionFacturacion;
}

export const DOCUMENTOS_POR_TIPO: Record<TipoFacturacion, { value: TipoDocumento; label: string }[]> = {
  particular: [
    { value: 'NIF', label: 'DNI / NIF' },
    { value: 'NIE', label: 'NIE' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'ID_EXTRANJERO', label: 'Documento de identidad extranjero' },
  ],
  empresa: [
    { value: 'CIF', label: 'CIF / NIF de la empresa' },
    { value: 'ID_EXTRANJERO', label: 'NIF-IVA de otro país' },
  ],
};

// Países más habituales primero; el resto, por orden alfabético.
export const PAISES: { code: string; name: string }[] = [
  { code: 'ES', name: 'España' },
  { code: 'FR', name: 'Francia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'DE', name: 'Alemania' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'IT', name: 'Italia' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'CH', name: 'Suiza' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AT', name: 'Austria' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CA', name: 'Canadá' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'GR', name: 'Grecia' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'LU', name: 'Luxemburgo' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'MX', name: 'México' },
  { code: 'NO', name: 'Noruega' },
  { code: 'PE', name: 'Perú' },
  { code: 'PL', name: 'Polonia' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'SE', name: 'Suecia' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
];

export const FACTURACION_VACIA: DatosFacturacion = {
  tipo: 'particular',
  nombre: '',
  tipoDocumento: 'NIF',
  documento: '',
  direccion: { linea1: '', linea2: '', codigoPostal: '', ciudad: '', provincia: '', pais: 'ES' },
};

// ==========================================================
// Validación de documentos (misma lógica que el backend)
// ==========================================================

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function normalizarDocumento(valor: string): string {
  return valor.toUpperCase().replace(/[\s.-]/g, '');
}

function esDniValido(v: string): boolean {
  if (!/^\d{8}[A-Z]$/.test(v)) return false;
  return LETRAS_DNI[Number(v.slice(0, 8)) % 23] === v[8];
}

function esNieValido(v: string): boolean {
  if (!/^[XYZ]\d{7}[A-Z]$/.test(v)) return false;
  const numero = 'XYZ'.indexOf(v[0]) + v.slice(1, 8);
  return LETRAS_DNI[Number(numero) % 23] === v[8];
}

function esCifValido(v: string): boolean {
  if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) return false;
  let suma = 0;
  for (let i = 0; i < 7; i++) {
    let n = Number(v[i + 1]);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    suma += n;
  }
  const control = (10 - (suma % 10)) % 10;
  const letraControl = 'JABCDEFGHI'[control];
  if ('PQRSNW'.includes(v[0])) return v[8] === letraControl;
  if ('ABEH'.includes(v[0])) return v[8] === String(control);
  return v[8] === String(control) || v[8] === letraControl;
}

export function esDocumentoValido(tipo: TipoDocumento, valor: string): boolean {
  const v = normalizarDocumento(valor);
  switch (tipo) {
    case 'NIF':
      return esDniValido(v);
    case 'NIE':
      return esNieValido(v);
    case 'CIF':
      return esCifValido(v);
    default:
      return /^[A-Z0-9]{5,20}$/.test(v);
  }
}

/** Devuelve el primer error del formulario de facturación, o '' si está completo. */
export function errorFacturacion(f: DatosFacturacion): string {
  if (f.nombre.trim().length < 2) {
    return f.tipo === 'empresa' ? 'Indica la razón social de la empresa.' : 'Indica el nombre y apellidos para la factura.';
  }
  if (!esDocumentoValido(f.tipoDocumento, f.documento)) {
    if (f.tipoDocumento === 'NIF') return 'El NIF/DNI no es válido. Revisa los números y la letra.';
    if (f.tipoDocumento === 'NIE') return 'El NIE no es válido. Revisa los números y la letra.';
    if (f.tipoDocumento === 'CIF') return 'El CIF no es válido. Revisa el número.';
    return 'El número de documento no es válido.';
  }
  const d = f.direccion;
  if (d.linea1.trim().length < 3) return 'Indica la dirección de facturación.';
  if (d.pais === 'ES' && !/^\d{5}$/.test(d.codigoPostal.trim())) return 'El código postal debe tener 5 dígitos.';
  if (d.codigoPostal.trim().length < 3) return 'Indica el código postal.';
  if (d.ciudad.trim().length < 2) return 'Indica la localidad.';
  if (d.pais === 'ES' && d.provincia.trim().length < 2) return 'Indica la provincia.';
  return '';
}