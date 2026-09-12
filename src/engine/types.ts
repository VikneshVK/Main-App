export const CURRENT_ENGINE_VERSION = 'v1.1.0-ieee399';

export type PowerUnit = 'kW' | 'kVA' | 'HP' | 'W';

export type StartingMethod =
  | 'DOL'           // Direct-On-Line (6.0x default, IEEE 399 / NEMA MG-1 Code G)
  | 'StarDelta'     // Star-Delta (3.0x default, IEC 60947-4-1)
  | 'SoftStarter'   // Electronic Soft Starter (2.5x default, 200-350% limit)
  | 'VFD'           // Variable Frequency Drive (1.2x default, soft ramp)
  | 'Inverter'      // Inverter Compressor / AC (1.2x default)
  | 'Conventional'  // Non-inverter AC / Reciprocating Compressor (3.5x default)
  | 'None';         // Resistive / Non-motor (1.0x)

export type LoadCategory =
  | 'General'
  | 'HVAC'
  | 'Motors'
  | 'Office'
  | 'Lighting'
  | 'Industrial'
  | 'Appliances'
  | 'Custom';

export type LoadConfidence = 'Nameplate' | 'Estimated' | 'Unknown_TBD';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type MotorStartingSequence =
  | 'Sequential'    // Standard: Staggered start; largest motor starts with running loads on
  | 'Simultaneous'; // Worst-case: All motors start concurrently (e.g. un-sequenced ATS transfer)

export type FacilityType =
  | 'Office'        // Commercial Office / IT Facility
  | 'Industrial'    // Manufacturing / Workshop / Factory
  | 'Retail'        // Showroom / Shopping Mall / Retail
  | 'Healthcare'    // Hospital / Critical Health Care
  | 'Custom';       // Custom User Profile

export interface LoadItem {
  id: string;
  name: string;
  category: LoadCategory;
  quantity: number;
  unitPower: number; // 0 if Unknown_TBD
  powerUnit: PowerUnit;
  powerFactor: number; // default 0.8 for inductive, 1.0 for resistive
  efficiency?: number; // e.g. 0.85 for motors
  isMotor: boolean;
  startingMethod: StartingMethod;
  customStartingMultiplier?: number; // optional override (e.g. 5.5 instead of 6.0)
  nemaCodeLetter?: string; // optional NEMA code letter (A through V)
  confidence: LoadConfidence;
  demandFactor?: number; // optional custom demand factor (0.1 to 1.0)
  notes?: string;
}

export interface GeneratorModel {
  id: string;
  modelName: string;
  manufacturer: string;
  alternatorModel?: string; // e.g. 'Stamford S0L2-P1'
  datasheetRef?: string; // e.g. 'CPCB IV+ Cummins C100D5e Datasheet'
  primeKva: number;
  standbyKva: number;
  primeKw: number;
  ratedPowerFactor?: number; // default 0.8
  phase: number; // 1 or 3
  voltage: string; // e.g. '415V 3-Phase'
  basePrice?: number;
  transientCapacityKva: number; // Alternator SKVA at 30% voltage dip
  isActive: boolean;
}

export interface SizingConfig {
  headroomPercent: number; // default 20% (80% continuous loading)
  applyDiversity: boolean;
  facilityType: FacilityType;
  motorStartingSequence: MotorStartingSequence;
  defaultMotorEfficiency: number; // default 0.85
  transientSurgeMultiplier: number; // fallback multiplier if alternator SKVA unavailable
  customDemandFactors?: Partial<Record<LoadCategory, number>>;
  customStartingMultipliers?: Partial<Record<StartingMethod, number>>;
}

export interface ProcessedLoadItem {
  item: LoadItem;
  unitRunningKw: number;
  unitRunningKva: number;
  unitRunningKvar: number;
  totalRunningKw: number;
  totalRunningKva: number;
  totalRunningKvar: number;
  demandFactorUsed: number;
  effectiveRunningKw: number;
  effectiveRunningKva: number;
  effectiveRunningKvar: number;
  startingMultiplier: number;
  unitStartingKva: number;
  totalStartingKva: number;
}

export interface EngineRulesetSnapshot {
  engineVersion: string;
  timestamp: string;
  standardsReference: string;
  facilityType: FacilityType;
  motorStartingSequence: MotorStartingSequence;
  headroomPercent: number;
  applyDiversity: boolean;
  activeDemandFactors: Record<LoadCategory, number>;
  activeStartingMultipliers: Record<StartingMethod, number>;
}

export interface SizingResult {
  summary: {
    engineVersion: string;
    totalLoadsCount: number;
    unknownLoadsCount: number;
    unknownLoadNames: string[];
    
    // Connected (undiversified) totals
    totalConnectedKw: number;
    totalConnectedKva: number;
    
    // Diversified totals
    totalDiversifiedKw: number;
    totalDiversifiedKva: number;
    totalDiversifiedKvar: number;
    systemPowerFactor: number;
    
    // Motor surges & transient
    motorStartingSequence: MotorStartingSequence;
    largestMotorSurgeKva: number;
    largestMotorName?: string;
    peakTransientKva: number;
    
    // Headroom & Continuous Operating Limits
    headroomPercent: number;
    requiredPrimeKva: number;
    requiredPrimeKw: number;
    continuousOperatingLimitKva: number;
    continuousOperatingLimitKw: number;
    continuousLoadUtilizationPercent: number; // kVA utilization %
    continuousLoadUtilizationKwPercent: number; // kW utilization %
    operatingMarginKva: number;
    operatingMarginKw: number;
    operatingMarginPercent: number;
    operatingMarginKwPercent: number;
    governingConstraint: 'kW' | 'kVA';
    availableHeadroomKva: number; // Kept for backwards compatibility (equals operatingMarginKva)
    
    // Recommendations
    recommendedGenerator: GeneratorModel | null;
    minimumAcceptableGenerator: GeneratorModel | null;
    heavyDutyGenerator: GeneratorModel | null;
    
    // Confidence & Rationale
    confidence: ConfidenceLevel;
    confidenceScore: number; // 0 - 100
    warnings: string[];
    rationale: string[];

    // Stated Disclosures for Quotation PDF & Legal Defensibility
    statedAssumptions: string[];
    rulesetSnapshot: EngineRulesetSnapshot;
  };
  breakdown: ProcessedLoadItem[];
}
