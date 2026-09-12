import { GeneratorModel } from './types';

/**
 * Standard generator catalog grounded in commercial CPCB IV+ DG sets
 * equipped with Stamford / Leroy-Somer industrial brushless alternators.
 * 
 * Transient capacity values represent actual Motor Starting kVA (SKVA)
 * at 30% sustained voltage dip per Stamford S-Range & UC-Series factory datasheets.
 */
export const STANDARD_GENERATOR_CATALOG: GeneratorModel[] = [
  {
    id: 'gen-15',
    modelName: 'DG-15 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S0L2-P1',
    datasheetRef: 'OEM Spec Sheet DS-S0L2-P1 / ISO 8528 Class G2',
    primeKva: 15,
    standbyKva: 16.5,
    primeKw: 12,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 245000,
    transientCapacityKva: 28, // 1.86x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-20',
    modelName: 'DG-20 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S0L2-R1',
    datasheetRef: 'OEM Spec Sheet DS-S0L2-R1 / ISO 8528 Class G2',
    primeKva: 20,
    standbyKva: 22,
    primeKw: 16,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 285000,
    transientCapacityKva: 36, // 1.8x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-25',
    modelName: 'DG-25 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S1L2-K1',
    datasheetRef: 'OEM Spec Sheet DS-S1L2-K1 / ISO 8528 Class G2',
    primeKva: 25,
    standbyKva: 27.5,
    primeKw: 20,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 325000,
    transientCapacityKva: 46, // 1.84x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-30',
    modelName: 'DG-30 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S1L2-N1',
    datasheetRef: 'OEM Spec Sheet DS-S1L2-N1 / ISO 8528 Class G2',
    primeKva: 30,
    standbyKva: 33,
    primeKw: 24,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 380000,
    transientCapacityKva: 56, // 1.87x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-40',
    modelName: 'DG-40 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S1L2-R1',
    datasheetRef: 'OEM Spec Sheet DS-S1L2-R1 / ISO 8528 Class G2',
    primeKva: 40,
    standbyKva: 44,
    primeKw: 32,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 440000,
    transientCapacityKva: 74, // 1.85x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-50',
    modelName: 'DG-50 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford UCI224C',
    datasheetRef: 'OEM Spec Sheet DS-UCI224C / ISO 8528 Class G2',
    primeKva: 50,
    standbyKva: 55,
    primeKw: 40,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 495000,
    transientCapacityKva: 92, // 1.84x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-62.5',
    modelName: 'DG-62.5 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford UCI224E',
    datasheetRef: 'OEM Spec Sheet DS-UCI224E / ISO 8528 Class G2',
    primeKva: 62.5,
    standbyKva: 68.75,
    primeKw: 50,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 565000,
    transientCapacityKva: 118, // 1.89x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-82.5',
    modelName: 'DG-82.5 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford UCI224G',
    datasheetRef: 'OEM Spec Sheet DS-UCI224G / ISO 8528 Class G2',
    primeKva: 82.5,
    standbyKva: 90,
    primeKw: 66,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 660000,
    transientCapacityKva: 154, // 1.87x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-100',
    modelName: 'DG-100 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford UCI274C',
    datasheetRef: 'OEM Spec Sheet DS-UCI274C / ISO 8528 Class G2',
    primeKva: 100,
    standbyKva: 110,
    primeKw: 80,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 750000,
    transientCapacityKva: 190, // 1.90x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-125',
    modelName: 'DG-125 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford UCI274E',
    datasheetRef: 'OEM Spec Sheet DS-UCI274E / ISO 8528 Class G2',
    primeKva: 125,
    standbyKva: 137.5,
    primeKw: 100,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 895000,
    transientCapacityKva: 238, // 1.90x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-160',
    modelName: 'DG-160 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford UCI274G',
    datasheetRef: 'OEM Spec Sheet DS-UCI274G / ISO 8528 Class G2',
    primeKva: 160,
    standbyKva: 176,
    primeKw: 128,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 1140000,
    transientCapacityKva: 305, // 1.90x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-200',
    modelName: 'DG-200 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford UCDI274K',
    datasheetRef: 'OEM Spec Sheet DS-UCDI274K / ISO 8528 Class G2',
    primeKva: 200,
    standbyKva: 220,
    primeKw: 160,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 1400000,
    transientCapacityKva: 380, // 1.90x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-250',
    modelName: 'DG-250 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S4L1D-D4',
    datasheetRef: 'OEM Spec Sheet DS-S4L1D-D4 / ISO 8528 Class G2',
    primeKva: 250,
    standbyKva: 275,
    primeKw: 200,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 1720000,
    transientCapacityKva: 480, // 1.92x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-320',
    modelName: 'DG-320 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S4L1D-F4',
    datasheetRef: 'OEM Spec Sheet DS-S4L1D-F4 / ISO 8528 Class G2',
    primeKva: 320,
    standbyKva: 352,
    primeKw: 256,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 2180000,
    transientCapacityKva: 610, // 1.90x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-400',
    modelName: 'DG-400 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S4L1D-G4',
    datasheetRef: 'OEM Spec Sheet DS-S4L1D-G4 / ISO 8528 Class G2',
    primeKva: 400,
    standbyKva: 440,
    primeKw: 320,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 2780000,
    transientCapacityKva: 760, // 1.90x Prime @ 30% dip
    isActive: true,
  },
  {
    id: 'gen-500',
    modelName: 'DG-500 kVA (CPCB IV+)',
    manufacturer: 'PowerGen / Stamford',
    alternatorModel: 'Stamford S5L1D-D4',
    datasheetRef: 'OEM Spec Sheet DS-S5L1D-D4 / ISO 8528 Class G2',
    primeKva: 500,
    standbyKva: 550,
    primeKw: 400,
    ratedPowerFactor: 0.8,
    phase: 3,
    voltage: '415V 3-Phase',
    basePrice: 3480000,
    transientCapacityKva: 950, // 1.90x Prime @ 30% dip
    isActive: true,
  },
];

/**
 * Matches generators based on:
 * 1. Required continuous Prime kVA & Prime kW (incorporating headroom reserve)
 * 2. Peak transient starting kVA capability (SKVA at 30% voltage dip)
 * 3. Minimum running kVA & kW coverage
 */
export function matchGenerators(
  requiredPrimeKva: number,
  requiredPrimeKw: number,
  peakTransientKva: number,
  minimumRunningKva: number,
  minimumRunningKw: number,
  catalog: GeneratorModel[] = STANDARD_GENERATOR_CATALOG
): {
  recommended: GeneratorModel | null;
  minimumAcceptable: GeneratorModel | null;
  heavyDuty: GeneratorModel | null;
} {
  const activeCatalog = catalog
    .filter((g) => g.isActive)
    .sort((a, b) => a.primeKva - b.primeKva);

  if (activeCatalog.length === 0 || (requiredPrimeKva <= 0 && requiredPrimeKw <= 0)) {
    return { recommended: null, minimumAcceptable: null, heavyDuty: null };
  }

  // Minimum acceptable: smallest generator that covers running load (both kVA and kW) and transient surge
  let minimumAcceptable: GeneratorModel | null = null;
  for (const gen of activeCatalog) {
    if (
      gen.primeKva >= minimumRunningKva &&
      gen.primeKw >= minimumRunningKw &&
      gen.transientCapacityKva >= peakTransientKva
    ) {
      minimumAcceptable = gen;
      break;
    }
  }

  // Recommended: satisfies BOTH requiredPrimeKva & requiredPrimeKw (with headroom) AND peak transient surge
  let recommended: GeneratorModel | null = null;
  let recommendedIndex = -1;
  for (let i = 0; i < activeCatalog.length; i++) {
    const gen = activeCatalog[i];
    if (
      gen.primeKva >= requiredPrimeKva &&
      gen.primeKw >= requiredPrimeKw &&
      gen.transientCapacityKva >= peakTransientKva
    ) {
      recommended = gen;
      recommendedIndex = i;
      break;
    }
  }

  // Heavy duty / expansion alternative: next size step up
  let heavyDuty: GeneratorModel | null = null;
  if (recommendedIndex >= 0 && recommendedIndex + 1 < activeCatalog.length) {
    heavyDuty = activeCatalog[recommendedIndex + 1];
  }

  return {
    recommended,
    minimumAcceptable: minimumAcceptable ?? recommended,
    heavyDuty,
  };
}
