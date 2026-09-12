import {
  LoadItem,
  SizingConfig,
  SizingResult,
  ProcessedLoadItem,
  GeneratorModel,
  CURRENT_ENGINE_VERSION,
  EngineRulesetSnapshot,
  LoadCategory,
  StartingMethod,
  AlternativeComparisonItem,
  AlternativeComparisons,
} from './types';
import {
  normalizeToKw,
  kwToKva,
  calculateKvar,
  vectorPowerSum,
  round,
} from './electricalMath';
import {
  resolveStartingMultiplier,
  calculateStartingKva,
  calculatePeakTransientDemand,
  STANDARD_STARTING_MULTIPLIERS,
} from './motorStarting';
import { resolveDemandFactor, FACILITY_PROFILES } from './diversity';
import { STANDARD_GENERATOR_CATALOG, matchGenerators } from './catalog';
import { evaluateConfidence } from './confidence';

export const DEFAULT_SIZING_CONFIG: SizingConfig = {
  headroomPercent: 20, // 20% headroom (operates at 80% prime load)
  applyDiversity: true,
  facilityType: 'Office',
  motorStartingSequence: 'Sequential',
  defaultMotorEfficiency: 0.85,
  transientSurgeMultiplier: 1.85,
};

/**
 * Evaluates a candidate generator alternative against the exact same
 * mandatory continuous operating limits (both kW and kVA) and transient surge.
 */
export function evaluateAlternativeCandidate(
  gen: GeneratorModel | null,
  demandKw: number,
  demandKva: number,
  peakTransientKva: number,
  headroomPercent: number,
  role: 'lower' | 'recommended' | 'heavyDuty'
): AlternativeComparisonItem | null {
  if (!gen) return null;

  const continuousLimitRatio = 1 - headroomPercent / 100;
  const continuousLimitPercent = Math.round(continuousLimitRatio * 100);
  const continuousLimitKva = round(gen.primeKva * continuousLimitRatio, 2);
  const continuousLimitKw = round(gen.primeKw * continuousLimitRatio, 2);

  const operatingMarginKva = round(continuousLimitKva - demandKva, 2);
  const operatingMarginKw = round(continuousLimitKw - demandKw, 2);
  const transientMargin = round(gen.transientCapacityKva - peakTransientKva, 2);

  const failureReasons: string[] = [];
  if (operatingMarginKw < 0) {
    const deficitKw = round(Math.abs(operatingMarginKw), 2);
    failureReasons.push(
      `Exceeds ${continuousLimitPercent}% continuous engine limit by ${deficitKw} kW (Limit: ${continuousLimitKw} kW, Demand: ${round(demandKw, 2)} kW)`
    );
  }
  if (operatingMarginKva < 0) {
    const deficitKva = round(Math.abs(operatingMarginKva), 2);
    failureReasons.push(
      `Exceeds ${continuousLimitPercent}% continuous kVA limit by ${deficitKva} kVA (Limit: ${continuousLimitKva} kVA, Demand: ${round(demandKva, 2)} kVA)`
    );
  }
  if (transientMargin < 0) {
    failureReasons.push(
      `Peak starting surge (${round(peakTransientKva, 1)} kVA) exceeds alternator transient capacity (${gen.transientCapacityKva} SKVA)`
    );
  }

  const qualifies = failureReasons.length === 0;

  const kwUtilization = gen.primeKw > 0 ? demandKw / gen.primeKw : 0;
  const kvaUtilization = gen.primeKva > 0 ? demandKva / gen.primeKva : 0;
  const governingConstraint: 'kW' | 'kVA' = kwUtilization >= kvaUtilization ? 'kW' : 'kVA';
  const governingMargin = governingConstraint === 'kW' ? operatingMarginKw : operatingMarginKva;

  let label: 'Minimum Acceptable' | 'Undersized / Not Recommended' | 'Recommended' | 'Heavy-Duty / Future';
  if (role === 'recommended') {
    label = 'Recommended';
  } else if (role === 'heavyDuty') {
    label = 'Heavy-Duty / Future';
  } else {
    label = qualifies ? 'Minimum Acceptable' : 'Undersized / Not Recommended';
  }

  return {
    generator: gen,
    qualifies,
    label,
    continuousLimitKva,
    continuousLimitKw,
    operatingMarginKva,
    operatingMarginKw,
    transientMarginKva: transientMargin,
    governingMargin,
    governingConstraint,
    failureReason: failureReasons.length > 0 ? failureReasons.join('; ') : undefined,
  };
}

/**
 * Master sizing engine orchestrator.
 * Takes raw customer load requirements and computes exact electrical metrics,
 * transient demand, catalog generator recommendations, stated disclosures,
 * and an immutable audit ruleset snapshot.
 */
export function calculateGeneratorSizing(
  loads: LoadItem[],
  customConfig?: Partial<SizingConfig>,
  catalog: GeneratorModel[] = STANDARD_GENERATOR_CATALOG
): SizingResult {
  const config: SizingConfig = {
    ...DEFAULT_SIZING_CONFIG,
    ...customConfig,
  };

  const processedList: ProcessedLoadItem[] = [];
  const unknownLoadNames: string[] = [];
  let unknownLoadsCount = 0;

  let totalConnectedKw = 0;
  let totalConnectedKva = 0;

  const vectorLoadInputs: Array<{ kw: number; kvar: number }> = [];
  const transientLoadInputs: Array<{
    name: string;
    unitRunningKva: number;
    unitStartingKva: number;
    quantity: number;
    isMotor: boolean;
  }> = [];

  for (const item of loads) {
    const isUnknown = item.confidence === 'Unknown_TBD' || item.unitPower <= 0;

    if (isUnknown) {
      unknownLoadsCount += item.quantity;
      if (!unknownLoadNames.includes(item.name)) {
        unknownLoadNames.push(item.name);
      }

      processedList.push({
        item,
        unitRunningKw: 0,
        unitRunningKva: 0,
        unitRunningKvar: 0,
        totalRunningKw: 0,
        totalRunningKva: 0,
        totalRunningKvar: 0,
        demandFactorUsed: 0,
        effectiveRunningKw: 0,
        effectiveRunningKva: 0,
        effectiveRunningKvar: 0,
        startingMultiplier: resolveStartingMultiplier(item, config.customStartingMultipliers),
        unitStartingKva: 0,
        totalStartingKva: 0,
      });
      continue;
    }

    const efficiency = item.isMotor
      ? item.efficiency ?? config.defaultMotorEfficiency
      : 1.0;

    const unitRunningKw = normalizeToKw(
      item.unitPower,
      item.powerUnit,
      item.powerFactor,
      efficiency
    );
    const unitRunningKva = kwToKva(unitRunningKw, item.powerFactor);
    const unitRunningKvar = calculateKvar(unitRunningKw, unitRunningKva);

    const totalKw = unitRunningKw * item.quantity;
    const totalKva = unitRunningKva * item.quantity;
    const totalKvar = unitRunningKvar * item.quantity;

    totalConnectedKw += totalKw;
    totalConnectedKva += totalKva;

    const demandFactor = resolveDemandFactor(
      item.category,
      config.facilityType,
      item.demandFactor,
      config.customDemandFactors,
      config.applyDiversity
    );

    const effectiveKw = totalKw * demandFactor;
    const effectiveKvar = totalKvar * demandFactor;
    const effectiveKva = totalKva * demandFactor;

    vectorLoadInputs.push({ kw: effectiveKw, kvar: effectiveKvar });

    const startingMultiplier = resolveStartingMultiplier(
      item,
      config.customStartingMultipliers
    );
    const unitStartingKva = calculateStartingKva(
      unitRunningKva,
      startingMultiplier
    );
    const totalStartingKva = unitStartingKva * item.quantity;

    transientLoadInputs.push({
      name: item.name,
      unitRunningKva,
      unitStartingKva,
      quantity: item.quantity,
      isMotor: item.isMotor,
    });

    processedList.push({
      item,
      unitRunningKw: round(unitRunningKw, 3),
      unitRunningKva: round(unitRunningKva, 3),
      unitRunningKvar: round(unitRunningKvar, 3),
      totalRunningKw: round(totalKw, 2),
      totalRunningKva: round(totalKva, 2),
      totalRunningKvar: round(totalKvar, 2),
      demandFactorUsed: round(demandFactor, 2),
      effectiveRunningKw: round(effectiveKw, 2),
      effectiveRunningKva: round(effectiveKva, 2),
      effectiveRunningKvar: round(effectiveKvar, 2),
      startingMultiplier,
      unitStartingKva: round(unitStartingKva, 2),
      totalStartingKva: round(totalStartingKva, 2),
    });
  }

  // Calculate Vector Power Sum for diversified total
  const vectorResult = vectorPowerSum(vectorLoadInputs);
  const totalDiversifiedKw = vectorResult.totalKw;
  const totalDiversifiedKvar = vectorResult.totalKvar;
  const totalDiversifiedKva = vectorResult.totalKva;
  const systemPowerFactor = vectorResult.systemPf;

  // Transient Peak starting demand based on chosen sequence mode
  const transientResult = calculatePeakTransientDemand(
    totalDiversifiedKva,
    config.motorStartingSequence,
    transientLoadInputs
  );

  // Headroom: requiredPrime = diversified / (1 - headroomPercent/100)
  // CRITICAL: Unrounded floating-point values are passed to matchGenerators to prevent lossy rounding
  const safeHeadroomRatio = Math.max(0.5, Math.min(0.95, 1 - config.headroomPercent / 100));
  const requiredPrimeKva = totalDiversifiedKva > 0 ? totalDiversifiedKva / safeHeadroomRatio : 0;
  const requiredPrimeKw = totalDiversifiedKw > 0 ? totalDiversifiedKw / safeHeadroomRatio : 0;

  // Match generator from catalog enforcing BOTH kW and kVA continuous limits
  const { recommended, minimumAcceptable, heavyDuty, smallerCandidate, runningLoadCandidate } = matchGenerators(
    requiredPrimeKva,
    requiredPrimeKw,
    transientResult.peakTransientKva,
    totalDiversifiedKva,
    totalDiversifiedKw,
    catalog
  );

  // Evaluate alternative candidates under the exact same continuous operating limit rules
  const lowerAlternative = evaluateAlternativeCandidate(
    smallerCandidate,
    totalDiversifiedKw,
    totalDiversifiedKva,
    transientResult.peakTransientKva,
    config.headroomPercent,
    'lower'
  );

  const recommendedAlternative = evaluateAlternativeCandidate(
    recommended,
    totalDiversifiedKw,
    totalDiversifiedKva,
    transientResult.peakTransientKva,
    config.headroomPercent,
    'recommended'
  );

  const heavyDutyAlternative = evaluateAlternativeCandidate(
    heavyDuty,
    totalDiversifiedKw,
    totalDiversifiedKva,
    transientResult.peakTransientKva,
    config.headroomPercent,
    'heavyDuty'
  );

  const alternativeComparisons: AlternativeComparisons = {
    lower: lowerAlternative,
    recommended: recommendedAlternative,
    heavyDuty: heavyDutyAlternative,
  };

  // An alternative can ONLY be designated 'Minimum Acceptable' if it passes all mandatory qualification criteria.
  // If the smaller candidate fails, it must NOT be labelled Minimum Acceptable.
  const resolvedMinimumAcceptable =
    lowerAlternative && lowerAlternative.qualifies ? lowerAlternative.generator : minimumAcceptable;

  const undersizedGenerator =
    lowerAlternative && !lowerAlternative.qualifies ? lowerAlternative.generator : null;

  // The generator evaluated for continuous headroom is the recommended unit,
  // or the running load candidate if no generator satisfies the full headroom reserve.
  const evalGenerator = recommended ?? runningLoadCandidate ?? resolvedMinimumAcceptable;

  // Continuous operating limit based on Prime capacity and headroom setting:
  // continuousLimit = Prime * (1 - headroomPercent/100)
  const continuousLimitRatio = 1 - config.headroomPercent / 100;
  const continuousOperatingLimitKva = evalGenerator
    ? round(evalGenerator.primeKva * continuousLimitRatio, 2)
    : 0;
  const continuousOperatingLimitKw = evalGenerator
    ? round(evalGenerator.primeKw * continuousLimitRatio, 2)
    : 0;

  // Continuous Load Utilization (% of Prime):
  // utilization = (operatingDemand / Prime) * 100
  const continuousLoadUtilizationPercent = evalGenerator && evalGenerator.primeKva > 0
    ? round((totalDiversifiedKva / evalGenerator.primeKva) * 100, 1)
    : 0;
  const continuousLoadUtilizationKwPercent = evalGenerator && evalGenerator.primeKw > 0
    ? round((totalDiversifiedKw / evalGenerator.primeKw) * 100, 1)
    : 0;

  // Operating Margin to continuous operating limit:
  // operatingMargin = continuousLimit - operatingDemand
  const operatingMarginKva = evalGenerator
    ? round(continuousOperatingLimitKva - totalDiversifiedKva, 2)
    : 0;
  const operatingMarginKw = evalGenerator
    ? round(continuousOperatingLimitKw - totalDiversifiedKw, 2)
    : 0;

  const operatingMarginPercent = evalGenerator && evalGenerator.primeKva > 0
    ? round((operatingMarginKva / evalGenerator.primeKva) * 100, 1)
    : 0;
  const operatingMarginKwPercent = evalGenerator && evalGenerator.primeKw > 0
    ? round((operatingMarginKw / evalGenerator.primeKw) * 100, 1)
    : 0;

  // Governing constraint: Active Power (kW) vs Apparent Power (kVA)
  const governingConstraint: 'kW' | 'kVA' =
    continuousLoadUtilizationKwPercent >= continuousLoadUtilizationPercent ? 'kW' : 'kVA';

  // availableHeadroomKva represents the operating margin to continuous limit
  const availableHeadroomKva = operatingMarginKva;

  // Evaluate recommendation confidence and warnings
  const confidenceEval = evaluateConfidence(
    loads,
    evalGenerator,
    totalDiversifiedKva,
    transientResult.peakTransientKva,
    operatingMarginKva,
    config.headroomPercent,
    totalDiversifiedKw,
    operatingMarginKw
  );

  // Compile Explicit Stated Assumptions for quotation & legal defensibility
  const statedAssumptions: string[] = [];

  if (config.motorStartingSequence === 'Sequential') {
    statedAssumptions.push(
      'Motor Starting Assumption: Sequential Start (assumes operating loads energized and largest single motor starts with staggered timing).'
    );
  } else {
    statedAssumptions.push(
      'Motor Starting Assumption: Simultaneous / ATS Block Start (assumes all connected motors start concurrently upon mains transfer).'
    );
  }

  statedAssumptions.push(
    `Diversity & Demand Profile: ${config.facilityType} facility coincidence factors applied per IEEE 399 recommendations.`
  );

  statedAssumptions.push(
    `Operating Headroom: Budgeted with ${config.headroomPercent}% reserve margin (maximum continuous operating loading ≤ ${100 - config.headroomPercent}% of Prime rating).`
  );

  if (recommended?.alternatorModel) {
    statedAssumptions.push(
      `Alternator Transient Capacity: Based on ${recommended.alternatorModel} factory curve at ≤ 30% voltage dip per ISO 8528 Class G2.`
    );
  }

  if (unknownLoadsCount > 0) {
    statedAssumptions.push(
      `CAUTION: Includes ${unknownLoadsCount} unconfirmed equipment item(s) (${unknownLoadNames.join(', ')}) marked as Information Required. Recommendation is provisional and subject to nameplate verification.`
    );
  }

  // Compile immutable Ruleset Snapshot for historical quote audit
  const activeDemandFactors: Record<LoadCategory, number> = {
    ...FACILITY_PROFILES[config.facilityType],
    ...config.customDemandFactors,
  };

  const activeStartingMultipliers: Record<StartingMethod, number> = {
    ...STANDARD_STARTING_MULTIPLIERS,
    ...config.customStartingMultipliers,
  };

  const rulesetSnapshot: EngineRulesetSnapshot = {
    engineVersion: CURRENT_ENGINE_VERSION,
    timestamp: new Date().toISOString(),
    standardsReference: 'IEEE Std 399-1997 / NEMA MG 1-2016 / IEC 60947-4-1 / ISO 8528-5',
    facilityType: config.facilityType,
    motorStartingSequence: config.motorStartingSequence,
    headroomPercent: config.headroomPercent,
    applyDiversity: config.applyDiversity,
    activeDemandFactors,
    activeStartingMultipliers,
  };

  return {
    summary: {
      engineVersion: CURRENT_ENGINE_VERSION,
      totalLoadsCount: loads.reduce((sum, item) => sum + item.quantity, 0),
      unknownLoadsCount,
      unknownLoadNames,

      totalConnectedKw: round(totalConnectedKw, 2),
      totalConnectedKva: round(totalConnectedKva, 2),

      totalDiversifiedKw,
      totalDiversifiedKva,
      totalDiversifiedKvar,
      systemPowerFactor,

      motorStartingSequence: config.motorStartingSequence,
      largestMotorSurgeKva: transientResult.largestMotorSurgeKva,
      largestMotorName: transientResult.largestMotorName,
      peakTransientKva: transientResult.peakTransientKva,

      headroomPercent: config.headroomPercent,
      requiredPrimeKva: round(requiredPrimeKva, 2),
      requiredPrimeKw: round(requiredPrimeKw, 2),
      continuousOperatingLimitKva,
      continuousOperatingLimitKw,
      continuousLoadUtilizationPercent,
      continuousLoadUtilizationKwPercent,
      operatingMarginKva,
      operatingMarginKw,
      operatingMarginPercent,
      operatingMarginKwPercent,
      governingConstraint,
      availableHeadroomKva,

      recommendedGenerator: recommended,
      minimumAcceptableGenerator: resolvedMinimumAcceptable,
      heavyDutyGenerator: heavyDuty,
      undersizedGenerator,
      alternativeComparisons,

      confidence: confidenceEval.level,
      confidenceScore: confidenceEval.score,
      warnings: confidenceEval.warnings,
      rationale: confidenceEval.rationale,

      statedAssumptions,
      rulesetSnapshot,
    },
    breakdown: processedList,
  };
}
