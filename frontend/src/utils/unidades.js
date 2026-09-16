// Mapeo de códigos de unidad a etiquetas cortas y claras
const UNIDAD_LABEL = {
  UN: 'u.',
  U: 'u.',
  UNI: 'u.',
  UNIDAD: 'u.',
  MT: 'm',
  M: 'm',
  METRO: 'm',
  KG: 'kg',
  KILO: 'kg',
  KILOGRAMO: 'kg',
  LT: 'L',
  L: 'L',
  LITRO: 'L',
  CAJA: 'caja',
  PACK: 'pack',
  M2: 'm²',
  CM: 'cm',
  MM: 'mm',
  GR: 'g',
  DOCENA: 'docena'
};

/**
 * Convierte un código de unidad a etiqueta corta y clara.
 * Evita que "UN" se traduzca a "Naciones Unidas" / "ONU".
 */
export function fmtUnidad(codigo) {
  if (!codigo) return '';
  const key = String(codigo).trim().toUpperCase();
  return UNIDAD_LABEL[key] || key;
}

/**
 * Formatea cantidad + unidad: "2.5 m", "3 u."
 */
export function fmtCantidadConUnidad(cantidad, permiteDecimales, unidadCodigo) {
  const n = Number(cantidad);
  const cantStr = permiteDecimales
    ? n.toFixed(3).replace(/\.?0+$/, '')
    : n.toFixed(0);
  return `${cantStr} ${fmtUnidad(unidadCodigo)}`.trim();
}