// Configuración de conceptos y tarifas de dietas.
// TODO: Sustituir valores placeholder por los reales de la tabla oficial.
export interface DietaRate {
  code: string;              // Identificador interno
  label: string;             // Etiqueta visible
  description?: string;      // Descripción opcional
  unit: 'dia' | 'ud';        // Unidad de cómputo
  amount: number;            // Importe por unidad (EUR)
  category?: 'nacional' | 'internacional';
  onlyFor?: 'nuevo' | 'antiguo'; // Restringir a tipo de conductor si aplica
}

export const DIETA_RATES: DietaRate[] = [
  { code: 'desayuno', label: 'Desayuno', unit: 'ud', amount: 5 },
  { code: 'comida', label: 'Comida', unit: 'ud', amount: 15 },
  { code: 'cena', label: 'Cena', unit: 'ud', amount: 15 },
  { code: 'pernocta', label: 'Pernocta', unit: 'dia', amount: 35 },
  { code: 'media_dieta', label: 'Media Dieta', unit: 'ud', amount: 30, onlyFor: 'nuevo' },
  { code: 'dieta_completa', label: 'Dieta Completa', unit: 'ud', amount: 54, onlyFor: 'antiguo' },
  // Ejemplos internacionales (placeholder)
  { code: 'pernocta_int', label: 'Pernocta Internacional', unit: 'dia', amount: 45, category: 'internacional' },
  { code: 'dieta_int', label: 'Dieta Internacional', unit: 'ud', amount: 65, category: 'internacional' },
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
  quantity: number; // número de unidades / días
}

export interface DietaCalculationInput {
  driverId: number;
  driverName: string;
  driverType: 'nuevo' | 'antiguo';
  orderNumber: string; // OC / Albarán
  month: string;       // YYYY-MM
  concepts: DietaConceptInput[];
  notes?: string;
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

export const calculateDietas = (input: DietaCalculationInput): DietaCalculationResult => {
  const concepts: DietaConceptResult[] = input.concepts.map(c => {
    const rate = DIETA_RATES.find(r => r.code === c.code);
    if (!rate) throw new Error(`Tarifa no encontrada para concepto ${c.code}`);
    return {
      ...c,
      label: rate.label,
      unit: rate.unit,
      rate: rate.amount,
      subtotal: c.quantity * rate.amount,
    };
  });
  const total = concepts.reduce((acc, c) => acc + c.subtotal, 0);
  return { total, concepts };
};
