import React from 'react';
import {
  Check,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  FileText,
  Clock,
} from 'lucide-react';
import { SizingResult, GeneratorModel } from '../../engine';

interface RecommendationCardProps {
  sizingResult: SizingResult;
  onSelectAlternative?: (gen: GeneratorModel) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  sizingResult,
}) => {
  const { summary } = sizingResult;
  const recommended = summary.recommendedGenerator;

  if (!recommended) {
    return (
      <div className="bg-white dark:bg-[#181D26] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Awaiting Load Data
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Add connected equipment or load presets to generate a defensible recommendation.
        </p>
      </div>
    );
  }

  // Calculate percentage utilization
  const continuousLimitPercent = 100 - summary.headroomPercent;
  const isOverLimit =
    summary.operatingMarginKva < 0 ||
    (summary.operatingMarginKw !== undefined && summary.operatingMarginKw < 0);
  const governingIsKw = summary.governingConstraint === 'kW';
  const governingUtilization = governingIsKw
    ? (summary.continuousLoadUtilizationKwPercent ?? summary.continuousLoadUtilizationPercent)
    : summary.continuousLoadUtilizationPercent;
  const governingMargin = governingIsKw
    ? (summary.operatingMarginKw ?? summary.operatingMarginKva)
    : summary.operatingMarginKva;
  const governingUnit = governingIsKw ? 'kW' : 'kVA';
  const marginBarWidth = Math.max(0, continuousLimitPercent - governingUtilization);

  const confidenceBadge = {
    High: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      label: 'High Confidence',
    },
    Medium: {
      bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
      label: 'Medium Confidence',
    },
    Low: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      label: 'Low / Caveated',
    },
  }[summary.confidence];

  return (
    <div className="bg-white dark:bg-[#181D26] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
      {/* Top Banner */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-amber-50/40 via-transparent to-transparent dark:from-amber-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                Recommended Generator
              </span>
              <span
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${confidenceBadge.bg}`}
              >
                {confidenceBadge.label} ({summary.confidenceScore}%)
              </span>
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {recommended.primeKva} kVA{' '}
              <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                Diesel Generator
              </span>
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
              <div>
                {recommended.modelName} • Prime: {recommended.primeKva} kVA ({recommended.primeKw} kW) • Standby: {recommended.standbyKva} kVA • {recommended.voltage}
              </div>
              {recommended.alternatorModel && (
                <div className="text-[11px] font-mono text-gray-400">
                  Alternator: <strong className="text-gray-700 dark:text-gray-300">{recommended.alternatorModel}</strong> • Transient limit: <strong className="text-purple-600 dark:text-purple-400">{recommended.transientCapacityKva} SKVA @ 30% dip</strong>
                </div>
              )}
            </div>
          </div>

          {recommended.basePrice && (
            <div className="text-right">
              <div className="text-[11px] font-semibold text-gray-400 uppercase">
                Catalog Base
              </div>
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                ₹ {recommended.basePrice.toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </div>

        {/* Headroom / Capacity Bar */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Continuous Operating Limits ({continuousLimitPercent}% Prime Limit)
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Governing: {governingIsKw ? 'Active Power (kW)' : 'Apparent Power (kVA)'}
            </span>
          </div>

          {/* Dual kW and kVA Metrics Table / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Apparent Power (kVA) Card */}
            <div className={`p-2.5 rounded-xl border ${!governingIsKw ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20' : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'}`}>
              <div className="flex items-center justify-between font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <span>Apparent Power (kVA)</span>
                {!governingIsKw && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Governing</span>}
              </div>
              <div className="space-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Operating Demand:</span>
                  <strong className="text-gray-900 dark:text-white">{summary.totalDiversifiedKva} kVA</strong>
                </div>
                <div className="flex justify-between">
                  <span>Continuous Limit:</span>
                  <strong className="text-gray-900 dark:text-white">{summary.continuousOperatingLimitKva} kVA</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                  <span>Margin ({summary.continuousLoadUtilizationPercent}% Prime):</span>
                  <strong className={summary.operatingMarginKva < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {summary.operatingMarginKva > 0 ? `+${summary.operatingMarginKva}` : summary.operatingMarginKva} kVA
                  </strong>
                </div>
              </div>
            </div>

            {/* Active Power (kW) Card */}
            <div className={`p-2.5 rounded-xl border ${governingIsKw ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20' : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'}`}>
              <div className="flex items-center justify-between font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <span>Active Power (kW)</span>
                {governingIsKw && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Governing</span>}
              </div>
              <div className="space-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Operating Demand:</span>
                  <strong className="text-gray-900 dark:text-white">{summary.totalDiversifiedKw} kW</strong>
                </div>
                <div className="flex justify-between">
                  <span>Continuous Limit:</span>
                  <strong className="text-gray-900 dark:text-white">{summary.continuousOperatingLimitKw} kW</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                  <span>Margin ({summary.continuousLoadUtilizationKwPercent}% Prime):</span>
                  <strong className={summary.operatingMarginKw < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {summary.operatingMarginKw > 0 ? `+${summary.operatingMarginKw}` : summary.operatingMarginKw} kW
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Progress Bar (Governing) */}
          <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex p-0.5 relative">
            {/* 1. Demand segment */}
            <div
              className={`h-full rounded-l-full transition-all duration-300 ${
                isOverLimit ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{
                width: `${Math.min(100, governingUtilization)}%`,
              }}
              title={`Governing Demand (${governingUnit}): ${governingUtilization}% of Prime`}
            />
            {/* 2. Margin segment up to continuous limit */}
            {marginBarWidth > 0 && (
              <div
                className="h-full bg-emerald-400/80 dark:bg-emerald-500/60 transition-all duration-300 ml-0.5"
                style={{ width: `${marginBarWidth}%` }}
                title={`Operating Margin: ${governingMargin} ${governingUnit} before ${continuousLimitPercent}% limit`}
              />
            )}
            {/* 3. Reserved Headroom buffer */}
            <div
              className="h-full bg-gray-300/60 dark:bg-gray-700/60 rounded-r-full transition-all duration-300 ml-0.5 border-l border-gray-400/40 dark:border-gray-600/40"
              style={{ width: `${summary.headroomPercent}%` }}
              title={`Reserved Headroom Buffer: ${summary.headroomPercent}% (Loading capped at ${continuousLimitPercent}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>0%</span>
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              ▲ {continuousLimitPercent}% Limit ({governingIsKw ? `${summary.continuousOperatingLimitKw} kW` : `${summary.continuousOperatingLimitKva} kVA`})
            </span>
            <span>100% Prime ({governingIsKw ? `${recommended.primeKw} kW` : `${recommended.primeKva} kVA`})</span>
          </div>
        </div>
      </div>

      {/* Rationale Checklist */}
      <div className="p-6 space-y-5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">
            Why This Generator? (Technical Rationale)
          </h4>
          <div className="space-y-2">
            {summary.rationale.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-800 dark:text-gray-200">
                <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="font-medium">{item}</span>
              </div>
            ))}

            {/* Warnings */}
            {summary.warnings.map((warn, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{warn}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stated Assumptions for PDF Quotation */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>Stated Quotation Disclosures (Printed on PDF)</span>
            </h4>
            <span className="text-[10px] font-mono text-gray-400">
              Audit Stamped
            </span>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-2">
            {summary.statedAssumptions.map((assumption, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                <span className="text-amber-500 font-bold">•</span>
                <span className="leading-relaxed">{assumption}</span>
              </div>
            ))}
            
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-[10px] font-mono text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Snapshot: {new Date(summary.rulesetSnapshot.timestamp).toLocaleTimeString()}
              </span>
              <span>Ruleset: {summary.rulesetSnapshot.standardsReference.split(' / ')[0]}</span>
            </div>
          </div>
        </div>

        {/* Alternative Models Comparison */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Catalog Alternatives & Continuous Headroom Analysis
            </div>
            <span className="text-[10px] text-gray-400 font-mono">
              Evaluated against {continuousLimitPercent}% Prime Limits
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* 1. Smaller Candidate: Minimum Acceptable (if qualified) OR Undersized / Not Recommended (if failed) */}
            {summary.alternativeComparisons?.lower ? (
              summary.alternativeComparisons.lower.qualifies ? (
                <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-xs">
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center justify-between">
                    <span>Minimum Acceptable</span>
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {summary.alternativeComparisons.lower.generator.primeKva} kVA
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Passes continuous limits ({summary.alternativeComparisons.lower.governingMargin > 0 ? `+${summary.alternativeComparisons.lower.governingMargin}` : summary.alternativeComparisons.lower.governingMargin} {summary.alternativeComparisons.lower.governingConstraint} margin to {continuousLimitPercent}% limit)
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs">
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase flex items-center justify-between">
                    <span>Undersized / Not Recommended</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
                    <span>{summary.alternativeComparisons.lower.generator.primeKva} kVA</span>
                    <span className="text-[10px] font-normal text-rose-600 dark:text-rose-400 font-mono">
                      (Disqualified)
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-1 font-medium leading-tight">
                    {summary.alternativeComparisons.lower.failureReason}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                    Operating margin to {continuousLimitPercent}% limit:{' '}
                    <strong className="text-rose-600 dark:text-rose-400">
                      {summary.alternativeComparisons.lower.operatingMarginKw} kW
                    </strong>{' '}
                    ({summary.alternativeComparisons.lower.operatingMarginKva} kVA)
                  </div>
                </div>
              )
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-xs flex items-center justify-center text-gray-400">
                Lowest Catalog Step
              </div>
            )}

            {/* 2. Recommended Model */}
            <div className="p-3 rounded-xl border-2 border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 text-xs">
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center justify-between">
                <span>Recommended</span>
                <Check className="w-3 h-3" />
              </div>
              <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                {recommended.primeKva} kVA
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-300 mt-1 leading-tight">
                Optimal balance of longevity, motor surge, & headroom
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                Margin to {continuousLimitPercent}% limit: +{summary.operatingMarginKw} kW (+{summary.operatingMarginKva} kVA)
              </div>
            </div>

            {/* 3. Heavy Duty */}
            {summary.alternativeComparisons?.heavyDuty ? (
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>Heavy-Duty / Future</span>
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">Passes</span>
                </div>
                <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                  {summary.alternativeComparisons.heavyDuty.generator.primeKva} kVA
                </div>
                <div className="text-[11px] text-gray-500 mt-1 leading-tight">
                  Provides high expansion headroom for future equipment
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  Margin to {continuousLimitPercent}% limit: +{summary.alternativeComparisons.heavyDuty.operatingMarginKw} kW (+{summary.alternativeComparisons.heavyDuty.operatingMarginKva} kVA)
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-xs flex items-center justify-center text-gray-400">
                Highest Catalog Step
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
