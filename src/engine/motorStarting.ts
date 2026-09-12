import { StartingMethod, MotorStartingSequence, LoadItem } from './types';
import { round } from './electricalMath';
import { NEMA_CODE_LETTERS } from './standards';

/**
 * Standard default starting inrush multipliers grounded in electrical standards:
 * - DOL: 6.0x (IEEE 399-1997 / NEMA MG-1 Table 10-22 Code G average 5.6-6.3 kVA/HP)
 * - StarDelta: 3.0x (IEC 60947-4-1: 1/3 of DOL inrush)
 * - SoftStarter: 2.5x (Typical solid-state SCR current limit 200%-350% FLA)
 * - VFD: 1.2x (Inverter current limit 110%-120% continuous)
 * - Inverter: 1.2x (Modulated inverter compressor)
 * - Conventional: 3.5x (Reciprocating / scroll compressor with run capacitor)
 * - None: 1.0x (Resistive / static electronics)
 */
export const STANDARD_STARTING_MULTIPLIERS: Record<StartingMethod, number> = {
  DOL: 6.0,          // IEEE 399 / NEMA Code G
  StarDelta: 3.0,    // IEC 60947-4-1
  SoftStarter: 2.5,  // Solid-State SCR Current Limit
  VFD: 1.2,          // Variable Frequency Drive Soft Ramp
  Inverter: 1.2,     // Inverter AC / BLDC
  Conventional: 3.5, // Fixed-speed Rotary / Reciprocating Compressor
  None: 1.0,         // Non-motor
};

export const STARTING_METHOD_DESCRIPTIONS: Record<StartingMethod, string> = {
  DOL: 'Direct-On-Line (6.0x FLA, IEEE 399 / NEMA MG-1 Code G)',
  StarDelta: 'Star-Delta (3.0x FLA, IEC 60947-4-1)',
  SoftStarter: 'Solid-State Soft Starter (2.5x Current Limited)',
  VFD: 'Variable Frequency Drive (1.2x Ramped Ramp-Up)',
  Inverter: 'Inverter Compressor / BLDC (1.2x Modulated)',
  Conventional: 'Conventional AC Compressor (3.5x Rotary)',
  None: 'Non-motor (Resistive / Electronic)',
};

/**
 * Resolves starting multiplier with precedence:
 * 1. Explicit item custom override
 * 2. NEMA code letter lookup
 * 3. Config custom multipliers
 * 4. Authoritative standard default
 */
export function resolveStartingMultiplier(
  item: LoadItem,
  customConfigMultipliers?: Partial<Record<StartingMethod, number>>
): number {
  if (!item.isMotor || item.startingMethod === 'None') {
    return 1.0;
  }

  if (item.customStartingMultiplier && item.customStartingMultiplier > 0) {
    return item.customStartingMultiplier;
  }

  if (item.nemaCodeLetter && NEMA_CODE_LETTERS[item.nemaCodeLetter.toUpperCase()]) {
    return NEMA_CODE_LETTERS[item.nemaCodeLetter.toUpperCase()].typicalMultiplier;
  }

  if (customConfigMultipliers && customConfigMultipliers[item.startingMethod] !== undefined) {
    return customConfigMultipliers[item.startingMethod]!;
  }

  return STANDARD_STARTING_MULTIPLIERS[item.startingMethod] ?? 1.0;
}

/**
 * Calculates peak starting surge for an individual load unit.
 */
export function calculateStartingKva(
  runningKva: number,
  startingMultiplier: number
): number {
  if (runningKva <= 0) return 0;
  return round(runningKva * startingMultiplier, 2);
}

/**
 * Calculates transient step demand based on the chosen starting sequence:
 * 
 * Mode 1: 'Sequential' (Default)
 * Assumes existing running loads are energized and only the single largest motor starts at once:
 * Peak Transient = (Total Diversified kVA - Running kVA of largest motor) + Starting kVA of largest motor
 * 
 * Mode 2: 'Simultaneous' (Un-sequenced ATS Block Start)
 * Assumes mains failure recovery where ALL connected motors re-accelerate simultaneously:
 * Peak Transient = Total Non-Motor Running kVA + Sum of Starting kVA for all motors
 */
export function calculatePeakTransientDemand(
  totalDiversifiedRunningKva: number,
  sequenceMode: MotorStartingSequence,
  loads: Array<{
    name: string;
    unitRunningKva: number;
    unitStartingKva: number;
    quantity: number;
    isMotor: boolean;
  }>
): {
  peakTransientKva: number;
  largestMotorSurgeKva: number;
  largestMotorName?: string;
} {
  const motorItems = loads.filter((l) => l.isMotor && l.unitStartingKva > 0);

  if (motorItems.length === 0) {
    return {
      peakTransientKva: round(totalDiversifiedRunningKva, 2),
      largestMotorSurgeKva: 0,
      largestMotorName: undefined,
    };
  }

  // Find largest single motor surge delta
  let maxSurgeDelta = 0;
  let largestMotorName: string | undefined = undefined;
  let largestMotorRunningKva = 0;
  let largestMotorStartingKva = 0;

  for (const item of motorItems) {
    const surgeDelta = item.unitStartingKva - item.unitRunningKva;
    if (surgeDelta > maxSurgeDelta) {
      maxSurgeDelta = surgeDelta;
      largestMotorName = item.name;
      largestMotorRunningKva = item.unitRunningKva;
      largestMotorStartingKva = item.unitStartingKva;
    }
  }

  if (sequenceMode === 'Simultaneous') {
    // Simultaneous Block Start: Sum all motor inrush + non-motor running loads
    let totalNonMotorRunningKva = 0;
    for (const item of loads) {
      if (!item.isMotor) {
        totalNonMotorRunningKva += item.unitRunningKva * item.quantity;
      }
    }

    let totalAllMotorsStartingKva = 0;
    for (const item of motorItems) {
      totalAllMotorsStartingKva += item.unitStartingKva * item.quantity;
    }

    const simultaneousTransientKva = totalNonMotorRunningKva + totalAllMotorsStartingKva;

    return {
      peakTransientKva: round(simultaneousTransientKva, 2),
      largestMotorSurgeKva: round(largestMotorStartingKva, 2),
      largestMotorName: `${largestMotorName} (+ ${motorItems.length - 1} other motors block start)`,
    };
  }

  // Sequential Mode (Default)
  const peakTransientKva = Math.max(
    totalDiversifiedRunningKva,
    totalDiversifiedRunningKva - largestMotorRunningKva + largestMotorStartingKva
  );

  return {
    peakTransientKva: round(peakTransientKva, 2),
    largestMotorSurgeKva: round(largestMotorStartingKva, 2),
    largestMotorName,
  };
}
