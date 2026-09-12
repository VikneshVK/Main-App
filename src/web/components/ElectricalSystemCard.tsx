import React from 'react';
import { Zap, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { ElectricalSystem, PhaseType, SizingResult } from '../../engine';

interface ElectricalSystemCardProps {
  electricalSystem: ElectricalSystem;
  onPhaseChange: (phase: PhaseType) => void;
  sizingResult: SizingResult;
}

export const ElectricalSystemCard: React.FC<ElectricalSystemCardProps> = ({
  electricalSystem,
  onPhaseChange,
  sizingResult,
}) => {
  const { phaseAudit } = sizingResult.summary;

  return (
    <div className="bg-white dark:bg-[#181D26] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Section Title & Voltage Metadata */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Electrical System Supply
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {electricalSystem.voltage} V • {electricalSystem.frequency} Hz
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {electricalSystem.phase === 'three'
              ? '415 V (Line-to-Line) 3-Phase AC Balanced Supply • Industrial Catalog (15 kVA – 500 kVA)'
              : '230 V (Line-to-Neutral) Single-Phase AC Supply • Commercial DG Catalog (5 kVA – 15 kVA max)'}
          </p>
        </div>

        {/* Right: Segmented Phase Toggle */}
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/80 max-w-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onPhaseChange('three')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                electricalSystem.phase === 'three'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              3-Phase (415V)
            </button>
            <button
              type="button"
              onClick={() => onPhaseChange('single')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                electricalSystem.phase === 'single'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Single-Phase (230V)
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Equipment Phase Audit Status Bar */}
      <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider">
            Equipment Phase Audit:
          </span>

          {/* Compatible Badge */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            {phaseAudit.compatibleCount} Compatible
          </span>

          {/* Requires Verification Badge */}
          {phaseAudit.requiresVerificationCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              {phaseAudit.requiresVerificationCount} Requires Phase Verification
            </span>
          )}

          {/* Incompatible Badge */}
          {phaseAudit.incompatibleCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
              <XCircle className="w-3 h-3 text-red-500" />
              {phaseAudit.incompatibleCount} Incompatible with {electricalSystem.phase === 'single' ? 'Single-Phase' : '3-Phase'}
            </span>
          )}
        </div>

        {/* Current Telemetry Pill */}
        <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
          Full-Load Line Current:{' '}
          <strong className="text-gray-900 dark:text-white font-bold">
            {sizingResult.summary.totalDiversifiedAmps} A
          </strong>
        </div>
      </div>

      {/* Critical Incompatibility Warning Banner */}
      {phaseAudit.hasIncompatibleLoads && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
          <XCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="font-bold">Physical Incompatibility Detected:</strong>
            <p>
              {phaseAudit.incompatibleCount} equipment item(s) are configured for 3-Phase or Star-Delta operation and cannot be energized by a {electricalSystem.voltage}V Single-Phase system. Switch supply to 3-Phase or update equipment specifications.
            </p>
          </div>
        </div>
      )}

      {/* Unverified Phase Advisory Banner */}
      {!phaseAudit.hasIncompatibleLoads && phaseAudit.hasUnknownPhaseLoads && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="font-bold">Phase Verification Required:</strong>
            <p>
              {phaseAudit.requiresVerificationCount} equipment item(s) have unverified phase configurations. Theoretical electrical demand is included in calculations, but site nameplate confirmation is required before finalizing quotation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
