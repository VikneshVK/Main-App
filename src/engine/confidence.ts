import { ConfidenceLevel, LoadItem, GeneratorModel } from './types';
import { round } from './electricalMath';

export interface ConfidenceEvaluation {
  level: ConfidenceLevel;
  score: number; // 0 - 100
  warnings: string[];
  rationale: string[];
}

export function evaluateConfidence(
  loads: LoadItem[],
  recommendedGen: GeneratorModel | null,
  diversifiedKva: number,
  peakTransientKva: number,
  operatingMarginKva: number,
  headroomPercent: number,
  diversifiedKw: number = 0,
  operatingMarginKw: number = 0,
  phaseAudit?: {
    hasUnknownPhaseLoads: boolean;
    hasIncompatibleLoads: boolean;
    requiresVerificationCount: number;
    incompatibleCount: number;
  }
): ConfidenceEvaluation {
  const warnings: string[] = [];
  const rationale: string[] = [];

  const unknownLoads = loads.filter((l) => l.confidence === 'Unknown_TBD' || l.unitPower <= 0);
  const estimatedLoads = loads.filter((l) => l.confidence === 'Estimated');
  const nameplateLoads = loads.filter((l) => l.confidence === 'Nameplate');

  if (loads.length === 0) {
    return {
      level: 'High',
      score: 100,
      warnings: [],
      rationale: ['Add loads to begin assessment'],
    };
  }

  let score = 100;

  // Unknown loads penalty
  if (unknownLoads.length > 0) {
    const unknownUnits = unknownLoads.reduce((sum, l) => sum + l.quantity, 0);
    score -= Math.min(60, unknownUnits * 25);
    
    if (unknownUnits === 1) {
      warnings.push(`1 equipment (${unknownLoads[0].name}) has unknown ratings. Recommendation may change upon confirmation.`);
    } else {
      warnings.push(`${unknownUnits} equipment (${unknownLoads.map(u => u.name).join(', ')}) have unknown ratings. Generator recommendation may change when ratings are confirmed.`);
    }
  }

  // Estimated loads penalty
  if (estimatedLoads.length > 0 && nameplateLoads.length === 0) {
    score -= 15;
  }

  // Check generator sizing coverage & build rationale
  if (recommendedGen) {
    rationale.push(
      diversifiedKw > 0
        ? `Handles calculated running requirement (${round(diversifiedKva, 1)} kVA / ${round(diversifiedKw, 1)} kW)`
        : `Handles calculated running requirement (${round(diversifiedKva, 1)} kVA)`
    );
    
    if (peakTransientKva > diversifiedKva) {
      rationale.push(`Accommodates peak starting demand (${round(peakTransientKva, 1)} kVA max surge)`);
    } else {
      rationale.push('Provides stable power for linear/steady-state loads');
    }

    const continuousLimitRatio = 1 - headroomPercent / 100;
    const continuousOperatingLimit = round(recommendedGen.primeKva * continuousLimitRatio, 2);
    const continuousLimitPercent = Math.round(continuousLimitRatio * 100);
    const utilizationPercent = round((diversifiedKva / recommendedGen.primeKva) * 100, 1);

    if (operatingMarginKva > 0) {
      rationale.push(
        `Operates at ${utilizationPercent}% of Prime capacity, leaving ${operatingMarginKva} kVA before the ${continuousLimitPercent}% continuous operating limit.`
      );
    } else if (operatingMarginKva === 0) {
      rationale.push(
        `Operates at ${utilizationPercent}% of Prime capacity, exactly matching the ${continuousLimitPercent}% continuous operating limit.`
      );
    } else {
      const deficitKva = round(Math.abs(operatingMarginKva), 2);
      rationale.push(
        `Operates at ${utilizationPercent}% of Prime capacity, exceeding the ${continuousLimitPercent}% continuous operating limit by ${deficitKva} kVA.`
      );
      warnings.push(
        `Continuous loading alert: Operating demand (${round(diversifiedKva, 1)} kVA) exceeds the ${continuousLimitPercent}% continuous limit (${continuousOperatingLimit} kVA).`
      );
      score -= 20;
    }

    if (diversifiedKw > 0 && recommendedGen.primeKw > 0) {
      const continuousOperatingLimitKw = round(recommendedGen.primeKw * continuousLimitRatio, 2);
      const utilizationKwPercent = round((diversifiedKw / recommendedGen.primeKw) * 100, 1);

      if (operatingMarginKw < 0) {
        const deficitKw = round(Math.abs(operatingMarginKw), 2);
        rationale.push(
          `Operates at ${utilizationKwPercent}% of Prime kW capacity, exceeding the ${continuousLimitPercent}% continuous engine limit by ${deficitKw} kW.`
        );
        warnings.push(
          `Continuous loading alert: Operating active load (${round(diversifiedKw, 1)} kW) exceeds the ${continuousLimitPercent}% continuous limit (${continuousOperatingLimitKw} kW).`
        );
        score -= 20;
      } else {
        rationale.push(
          `Active power margin: ${operatingMarginKw} kW remaining before ${continuousLimitPercent}% continuous engine limit (${utilizationKwPercent}% Prime kW loading).`
        );
      }
    }

    // Check if starting surge is close to transient limit
    if (peakTransientKva > recommendedGen.transientCapacityKva * 0.85) {
      warnings.push(`High motor starting surge: Peak transient (${round(peakTransientKva, 1)} kVA) reaches ${round((peakTransientKva / recommendedGen.transientCapacityKva) * 100)}% of alternator transient capability.`);
      score -= 10;
    }

    // Check if provisional generator model is selected
    if (recommendedGen.isProvisional) {
      warnings.push(
        'PROVISIONAL DATA: Sizing is based on provisional single-phase generator ratings pending OEM manufacturer datasheet confirmation.'
      );
      rationale.push('Provisional reference single-phase generator model matched.');
      score -= 10;
    }
  } else {
    warnings.push('No standard generator in the catalog is large enough to support the calculated load.');
    score = 10;
  }

  // Phase Governance Audits
  if (phaseAudit) {
    if (phaseAudit.hasIncompatibleLoads) {
      warnings.push(
        `ELECTRICAL INCOMPATIBILITY: ${phaseAudit.incompatibleCount} equipment item(s) are incompatible with the selected electrical system supply.`
      );
      score -= 40;
    }
    if (phaseAudit.hasUnknownPhaseLoads) {
      warnings.push(
        `PHASE VERIFICATION REQUIRED: ${phaseAudit.requiresVerificationCount} equipment item(s) have unverified phase configurations. Theoretical demand is budgeted, but field verification is required before final quotation.`
      );
      score -= 20;
      rationale.push(
        `${phaseAudit.requiresVerificationCount} equipment item(s) require single-phase vs 3-phase nameplate verification.`
      );
    }
  }

  // Unknown load reminder in rationale
  if (unknownLoads.length > 0) {
    const unknownCount = unknownLoads.reduce((sum, l) => sum + l.quantity, 0);
    rationale.push(`${unknownCount} motor/equipment rating(s) currently marked as TBD / Information Required`);
  }

  // Final score clamping & level assignment
  const finalScore = Math.max(10, Math.min(100, score));
  let level: ConfidenceLevel = 'High';

  if (unknownLoads.length > 0 || (phaseAudit && phaseAudit.hasIncompatibleLoads) || finalScore < 60) {
    level = 'Low';
  } else if (finalScore < 85 || (phaseAudit && phaseAudit.hasUnknownPhaseLoads) || recommendedGen?.isProvisional) {
    level = 'Medium';
  }

  return {
    level,
    score: finalScore,
    warnings,
    rationale,
  };
}
