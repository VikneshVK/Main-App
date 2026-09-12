import { LoadCategory, FacilityType } from './types';

/**
 * Standard industry electrical diversity / demand factor profiles by facility type.
 * Acknowledges that an industrial machine shop, commercial IT office, retail mall,
 * or healthcare hospital exhibit vastly different operational coincidences.
 */
export const FACILITY_PROFILES: Record<FacilityType, Record<LoadCategory, number>> = {
  Office: {
    Lighting: 0.90,     // 90% common area and office fixtures on
    HVAC: 0.85,         // 85% cooling cycling in commercial spaces
    Motors: 0.80,       // 80% water/sump pumps
    Office: 0.70,       // 70% PC / workstation simultaneous utilization
    Industrial: 0.70,
    Appliances: 0.50,   // 50% pantry appliances
    General: 0.75,
    Custom: 1.00,
  },
  Industrial: {
    Lighting: 0.95,     // 95% factory floor high-bay lighting
    HVAC: 0.90,         // 90% process chillers and ventilation
    Motors: 0.90,       // 90% continuous manufacturing pumps & conveyors
    Office: 0.60,       // 60% admin office PCs
    Industrial: 0.85,   // 85% CNC, lathe, presses duty cycle
    Appliances: 0.40,   // 40% breakroom appliances
    General: 0.85,
    Custom: 1.00,
  },
  Retail: {
    Lighting: 1.00,     // 100% display & architectural lighting always on
    HVAC: 0.95,         // 95% continuous customer comfort
    Motors: 0.80,
    Office: 0.60,
    Industrial: 0.70,
    Appliances: 0.70,   // 70% food courts / coffee counters
    General: 0.85,
    Custom: 1.00,
  },
  Healthcare: {
    Lighting: 0.95,     // 95% hospital corridors, OT, patient rooms
    HVAC: 1.00,         // 100% sterile positive-pressure HVAC
    Motors: 0.95,       // 95% medical oxygen, vacuum, water booster
    Office: 0.80,       // 80% diagnostic monitors, nursing stations
    Industrial: 0.80,
    Appliances: 0.70,
    General: 0.90,
    Custom: 1.00,
  },
  Custom: {
    Lighting: 0.85,
    HVAC: 0.85,
    Motors: 0.85,
    Office: 0.80,
    Industrial: 0.80,
    Appliances: 0.60,
    General: 0.80,
    Custom: 1.00,
  },
};

/**
 * Resolves the applicable demand factor with precedence:
 * 1. Explicit item override (if set by salesperson)
 * 2. User/admin config override for this category
 * 3. Facility profile default
 */
export function resolveDemandFactor(
  category: LoadCategory,
  facilityType: FacilityType = 'Office',
  itemCustomFactor?: number,
  configCustomFactors?: Partial<Record<LoadCategory, number>>,
  applyDiversity: boolean = true
): number {
  if (!applyDiversity) return 1.0;

  // 1. Explicit load item override
  if (itemCustomFactor !== undefined && itemCustomFactor > 0 && itemCustomFactor <= 1.0) {
    return itemCustomFactor;
  }

  // 2. Custom config factor
  if (configCustomFactors && configCustomFactors[category] !== undefined) {
    return configCustomFactors[category]!;
  }

  // 3. Facility profile default
  const profile = FACILITY_PROFILES[facilityType] ?? FACILITY_PROFILES.Office;
  return profile[category] ?? 0.80;
}
