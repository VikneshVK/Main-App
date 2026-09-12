import { PowerUnit } from './types';

export const HP_TO_KW_FACTOR = 0.7457; // 1 Mechanical HP = 0.745699872 kW

/**
 * Rounds a number to a specific number of decimal places.
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Normalizes any power unit into electrical input Active Power (kW).
 * For motors specified in HP, efficiency (eta) is applied to calculate electrical input kW:
 * Input kW = (HP * 0.7457) / efficiency
 */
export function normalizeToKw(
  unitPower: number,
  unit: PowerUnit,
  powerFactor: number = 0.8,
  efficiency: number = 0.85
): number {
  if (unitPower <= 0) return 0;
  const safePf = Math.min(1.0, Math.max(0.1, powerFactor));
  const safeEff = Math.min(1.0, Math.max(0.1, efficiency));

  switch (unit) {
    case 'W':
      return unitPower / 1000;
    case 'kW':
      return unitPower;
    case 'kVA':
      return unitPower * safePf;
    case 'HP':
      return (unitPower * HP_TO_KW_FACTOR) / safeEff;
    default:
      return unitPower;
  }
}

/**
 * Calculates apparent power (kVA) from active power (kW) and power factor.
 * kVA = kW / PF
 */
export function kwToKva(kw: number, powerFactor: number = 0.8): number {
  if (kw <= 0) return 0;
  const safePf = Math.min(1.0, Math.max(0.1, powerFactor));
  return kw / safePf;
}

/**
 * Calculates reactive power (kVAR) from kW and kVA:
 * kVAR = sqrt(max(0, kVA^2 - kW^2))
 */
export function calculateKvar(kw: number, kva: number): number {
  if (kw <= 0 || kva <= 0) return 0;
  const diff = Math.max(0, kva * kva - kw * kw);
  return Math.sqrt(diff);
}

/**
 * Performs vector power summation:
 * S_total = sqrt((sum P)^2 + (sum Q)^2)
 * System PF = sum P / S_total
 */
export function vectorPowerSum(loads: Array<{ kw: number; kvar: number }>): {
  totalKw: number;
  totalKvar: number;
  totalKva: number;
  systemPf: number;
} {
  const totalKw = loads.reduce((acc, curr) => acc + curr.kw, 0);
  const totalKvar = loads.reduce((acc, curr) => acc + curr.kvar, 0);
  const totalKva = Math.sqrt(totalKw * totalKw + totalKvar * totalKvar);
  const systemPf = totalKva > 0 ? totalKw / totalKva : 1.0;

  return {
    totalKw: round(totalKw, 2),
    totalKvar: round(totalKvar, 2),
    totalKva: round(totalKva, 2),
    systemPf: round(systemPf, 3),
  };
}
