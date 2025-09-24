// Configuración de conceptos y tarifas de dietas.
// TODO: Sustituir valores placeholder por los reales de la tabla oficial (imagen enviada) diferenciando:
//  - Conceptos específicos para 'antiguo' y 'nuevo'
//  - Importe de medias (0.5) cuando proceda (p.ej. media dieta / medio desayuno si aplica)
//  - Nacional vs Internacional
//  - Códigos exactos y descripciones fieles
export interface DietaRate {
  code: string;              // Identificador interno
  label: string;             // Etiqueta visible
  description?: string;      // Descripción opcional
  unit: 'dia' | 'ud';        // Unidad de cómputo
  amount?: number;           // Importe por unidad (EUR) si es fijo
  category?: 'nacional' | 'internacional';
  onlyFor?: 'nuevo' | 'antiguo'; // Restringir a tipo de conductor si aplica
  percentKmTramo?: number;   // Si es un recargo porcentual sobre el importe del tramo kms (ej: ADR 0.05, Reefer 0.10)
  variable?: boolean;        // Si true, el importe es editable por el usuario (se ignora amount fijo y se usa customRate)
}

export const DIETA_RATES: DietaRate[] = [
  // Antiguos (se mantienen todas las tarifas previas salvo que se limiten en UI por tipo)
  { code: 'acarreos', label: 'Acarreos', unit: 'ud', amount: 4.5, onlyFor: 'antiguo' },
  { code: 'pif_semana', label: 'PIF Semana Completa', unit: 'ud', amount: 200, onlyFor: 'antiguo' },
  { code: 'pif_dia', label: 'PIF Día Completo', unit: 'ud', amount: 40, onlyFor: 'antiguo' },
  { code: 'pif_medio', label: 'PIF Medio Día', unit: 'ud', amount: 20, onlyFor: 'antiguo' },
  { code: 'pif_esporadico', label: 'PIF Servicio Esporádico', unit: 'ud', amount: 9, onlyFor: 'antiguo' },
  { code: 'dieta_int', label: 'Dieta Internacional', unit: 'ud', amount: 90.68, category: 'internacional', onlyFor: 'antiguo' },
  { code: 'almuerzo', label: 'Almuerzo', unit: 'ud', amount: 8.5, onlyFor: 'antiguo' },
  { code: 'cena', label: 'Cena', unit: 'ud', amount: 8.5, onlyFor: 'antiguo' },
  { code: 'cargas_descargas', label: 'Cargas/Descargas', unit: 'ud', amount: 25, onlyFor: 'antiguo' },
  { code: 'servicios_locales', label: 'Servicios Locales', unit: 'ud', amount: 9, onlyFor: 'antiguo' },
  { code: 'repartos_inditex', label: 'Repartos Inditex', unit: 'ud', amount: 6, onlyFor: 'antiguo' },
  { code: 'canon_tti', label: 'Canon TTI', unit: 'ud', amount: 20 }, // Disponible para antiguo y nuevo
  { code: 'adr', label: 'ADR (+5% tramo kms)', unit: 'ud', percentKmTramo: 0.05, onlyFor: 'antiguo' },
  { code: 'reefer', label: 'Reefer (+10% tramo kms)', unit: 'ud', percentKmTramo: 0.10, onlyFor: 'antiguo' },
  { code: 'pernocta_antiguo', label: 'Pernocta', unit: 'dia', amount: 40, onlyFor: 'antiguo', variable: true },
  { code: 'festivo_antiguo', label: 'Festivo', unit: 'ud', amount: 45, onlyFor: 'antiguo' }, // Nuevo concepto solicitado
  // Nuevos: solo pernocta y festivos, ambos 50€
  { code: 'pernocta', label: 'Pernocta', unit: 'dia', amount: 50, onlyFor: 'nuevo', variable: true },
  { code: 'festivos', label: 'Festivos', unit: 'ud', amount: 50, onlyFor: 'nuevo', variable: true },
];

// Número de días desde el alta para considerar "nuevo" (asumido)
export const DRIVER_NEW_THRESHOLD_DAYS = 180;

export const classifyDriverByHireDate = (hireDate?: string): 'nuevo' | 'antiguo' => {
  if (!hireDate) return 'antiguo';
  const diffMs = Date.now() - new Date(hireDate).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= DRIVER_NEW_THRESHOLD_DAYS ? 'nuevo' : 'antiguo';
};

export interface DietaConceptInput {
  code: string;
  quantity: number; // puede ser decimal (ej: 0.5)
  customRate?: number; // Importe manual cuando el concepto es variable (p.ej. pernocta)
}

export interface DietaCalculationInput {
  driverId: number;
  driverName: string;
  driverType: 'nuevo' | 'antiguo';
  orderNumber: string; // OC / Albarán
  month: string;       // YYYY-MM
  concepts: DietaConceptInput[];
  notes?: string;
  kmsAntiguo?: number; // Solo para antiguos: kms recorridos para calcular tramo automático
}

export interface DietaConceptResult extends DietaConceptInput {
  label: string;
  unit: string;
  rate: number;
  subtotal: number;
}

export interface DietaCalculationResult {
  total: number;
  concepts: DietaConceptResult[];
}

// Tramos de kilómetros para conductores 'antiguo'.
// TODO: Rellenar con los importes reales de la tabla (imagen) – actualmente valores placeholder.
export interface KilometerRange {
  code: string;        // código interno (p.ej. kms_t1)
  min: number;         // inclusive
  max: number | null;  // inclusive, null = sin límite superior
  amount: number;      // importe fijo asociado al tramo
  label?: string;      // etiqueta opcional; si no se provee se genera dinámicamente
}

export const KILOMETER_RANGES_ANTIGUO: KilometerRange[] = [
  // Tramos reales proporcionados (importe en €) – todos inclusivos
  { code: 'kms_t1', min: 0,    max: 199,  amount: 13,  label: '0-199 km' },
  { code: 'kms_t2', min: 200,  max: 330,  amount: 27,  label: '200-330 km' },
  { code: 'kms_t3', min: 331,  max: 460,  amount: 32,  label: '331-460 km' },
  { code: 'kms_t4', min: 461,  max: 700,  amount: 54,  label: '461-700 km' },
  { code: 'kms_t5', min: 701,  max: 1000, amount: 81,  label: '701-1000 km' },
  { code: 'kms_t6', min: 1001, max: 1260, amount: 108, label: '1001-1260 km' },
  { code: 'kms_t7', min: 1261, max: 1540, amount: 135, label: '1261-1540 km' },
  { code: 'kms_t8', min: 1541, max: 1800, amount: 162, label: '1541-1800 km' },
  { code: 'kms_t9', min: 1801, max: 2080, amount: 189, label: '1801-2080 km' },
  { code: 'kms_t10', min: 2081, max: 2400, amount: 216, label: '2081-2400 km' },
];

export const findKilometerRangeAntiguo = (kms: number): KilometerRange | null => {
  if (isNaN(kms) || kms < 0) return null;
  const range = KILOMETER_RANGES_ANTIGUO.find(r => (kms >= r.min) && (r.max == null || kms <= r.max));
  if (range) return range;
  // Si supera el máximo definido (2400) usar último tramo (importe tope)
  const last = KILOMETER_RANGES_ANTIGUO[KILOMETER_RANGES_ANTIGUO.length - 1];
  if (last && last.max !== null && kms > last.max) return last;
  return null;
};

export const calculateDietas = (input: DietaCalculationInput): DietaCalculationResult => {
  const concepts: DietaConceptResult[] = [];

  // Conceptos manuales seleccionados
  input.concepts.forEach(c => {
    // 'extra:' prefijo especial para conceptos libres -> code formato extra:Nombre:Importe
    if (c.code.startsWith('extra:')) {
      const parts = c.code.split(':');
      const customLabel = parts[1] || 'Extra';
      const customRate = Number(parts[2] || '0');
      concepts.push({
        ...c,
        label: customLabel,
        unit: 'ud',
        rate: customRate,
        subtotal: c.quantity * customRate,
      });
      return;
    }
    // 'extraPct:' formato extraPct:Nombre:percent:base  base=kmTramo|totalBase
    if (c.code.startsWith('extraPct:')) {
      const parts = c.code.split(':');
      const customLabel = parts[1] || 'Extra %';
      const percentRaw = Number(parts[2] || '0');
      const percent = isNaN(percentRaw) ? 0 : (percentRaw > 1 ? percentRaw / 100 : percentRaw); // permitir 5 ó 0.05
      const baseKey = (parts[3] as 'kmTramo'|'totalBase') || 'kmTramo';
      concepts.push({
        ...c,
        label: `${customLabel} (${(percent*100).toFixed(2)}% sobre ${baseKey==='kmTramo' ? 'Tramo Kms' : 'Total Base'})`,
        unit: 'ud',
        rate: 0, // se calcula después
        subtotal: 0,
      });
      return;
    }
    const rate = DIETA_RATES.find(r => r.code === c.code);
    if (!rate) throw new Error(`Tarifa no encontrada para concepto ${c.code}`);
    let unitAmount = rate.amount ?? 0;
    // Sustituir por customRate si la tarifa es variable y se ha proporcionado
    if (rate.variable && typeof c.customRate === 'number' && !isNaN(c.customRate)) {
      unitAmount = c.customRate;
    }
    // percentKmTramo se aplica después de conocer tramo, lo dejamos temporal con placeholder y recalculamos más abajo
    if (!rate.percentKmTramo) {
      concepts.push({
        ...c,
        label: rate.label,
        unit: rate.unit,
        rate: unitAmount,
        subtotal: c.quantity * unitAmount,
      });
    } else {
      // Guardamos entrada para post-proceso
      concepts.push({
        ...c,
        label: rate.label,
        unit: rate.unit,
        rate: 0,
        subtotal: 0,
      });
    }
  });

  // Tramo kms solo para antiguos (los nuevos no tienen rango de kms)
  let kmTramoAmount = 0;
  if (input.driverType === 'antiguo' && typeof input.kmsAntiguo === 'number' && input.kmsAntiguo >= 0) {
    const tramo = findKilometerRangeAntiguo(input.kmsAntiguo);
    if (tramo) {
      kmTramoAmount = tramo.amount;
      concepts.push({
        code: tramo.code,
        quantity: 1,
        label: `Tramo kms ${tramo.label || `${tramo.min}-${tramo.max ?? '+'}`} (entrada: ${input.kmsAntiguo} km)`,
        unit: 'ud',
        rate: tramo.amount,
        subtotal: tramo.amount,
      });
    }
  }

  // Recalcular recargos percentuales (sobre importe tramo kms) ahora que sabemos kmTramoAmount
  if (input.driverType === 'antiguo') {
    concepts.forEach(c => {
      const rateDef = DIETA_RATES.find(r => r.code === c.code);
      if (rateDef?.percentKmTramo) {
        const base = kmTramoAmount;
        c.rate = base > 0 ? +(base * rateDef.percentKmTramo).toFixed(2) : 0;
        c.subtotal = c.rate * c.quantity;
      }
    });
  }

  // Calcular extras porcentuales tras tener totales base (sin contar ellos mismos)
  const totalBase = concepts
    .filter(c => !c.code.startsWith('extraPct:'))
    .reduce((acc, c) => acc + c.subtotal, 0);
  concepts.forEach(c => {
    if (c.code.startsWith('extraPct:')) {
      const parts = c.code.split(':');
      const percentRaw = Number(parts[2] || '0');
      const percent = isNaN(percentRaw) ? 0 : (percentRaw > 1 ? percentRaw / 100 : percentRaw);
      const baseKey = parts[3] || 'kmTramo';
      const baseValue = baseKey === 'totalBase' ? totalBase : kmTramoAmount;
      c.rate = +(baseValue * percent).toFixed(2);
      c.subtotal = c.rate * c.quantity;
    }
  });

  const total = concepts.reduce((acc, c) => acc + c.subtotal, 0);
  return { total, concepts };
};
