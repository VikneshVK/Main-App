import React from 'react';
import {
  Activity,
  Zap,
  Sliders,
  ArrowUpRight,
  Layers,
  Building2,
  Workflow,
  AlertCircle,
} from 'lucide-react';
import {
  SizingResult,
  FacilityType,
  MotorStartingSequence,
} from '../../engine';

interface TelemetryCardsProps {
  sizingResult: SizingResult;
  headroomPercent: number;
  applyDiversity: boolean;
  facilityType: FacilityType;
  motorStartingSequence: MotorStartingSequence;
  onHeadroomChange: (val: number) => void;
  onDiversityToggle: (val: boolean) => void;
  onFacilityChange: (type: FacilityType) => void;
  onSequenceToggle: (seq: MotorStartingSequence) => void;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  sizingResult,
  headroomPercent,
  applyDiversity,
  facilityType,
  motorStartingSequence,
  onHeadroomChange,
  onDiversityToggle,
  onFacilityChange,
  onSequenceToggle,
}) => {
  const { summary } = sizingResult;

  return (
    <div className="space-y-4">
      {/* Top 4 Electrical Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Connected Load */}
        <div className="bg-white dark:bg-[#181D26] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Connected Load
            </span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {summary.totalConnectedKw}
            </span>
            <span className="text-xs font-bold text-gray-500">kW</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
            <span>Apparent / Current:</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {summary.totalConnectedKva} kVA ({summary.totalConnectedAmps} A)
            </span>
          </div>
        </div>

        {/* Diversified Operating Demand */}
        <div className="bg-white dark:bg-[#181D26] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Operating Demand
            </span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.totalDiversifiedKva}
            </span>
            <span className="text-xs font-bold text-gray-500">kVA</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
            <span>Current / Power:</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {summary.totalDiversifiedAmps} A • {summary.totalDiversifiedKw} kW
            </span>
          </div>
        </div>

        {/* Vector System Power Factor */}
        <div className="bg-white dark:bg-[#181D26] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Vector System PF
            </span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {summary.systemPowerFactor}
            </span>
            <span className="text-xs font-bold text-amber-500">cos φ</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
            <span>Formula:</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Vector Sum √(P² + Q²)
            </span>
          </div>
        </div>

        {/* Peak Starting Inrush */}
        <div className="bg-white dark:bg-[#181D26] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Peak Starting Surge
            </span>
            <ArrowUpRight className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {summary.peakTransientKva}
            </span>
            <span className="text-xs font-bold text-gray-500">kVA</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between truncate">
            <span>Sequence mode:</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400 truncate">
              {summary.motorStartingSequence}
            </span>
          </div>
        </div>
      </div>

      {/* Engineering Controls Toolbar */}
      <div className="bg-white dark:bg-[#181D26] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          {/* Facility Profile Selector */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Facility Diversity Profile:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(['Office', 'Industrial', 'Retail', 'Healthcare'] as FacilityType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => onFacilityChange(type)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
                    facilityType === type
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-700 font-bold'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Motor Starting Sequence Toggle */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-purple-500" />
                <span>Motor Starting Sequence:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onSequenceToggle('Sequential')}
                className={`py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  motorStartingSequence === 'Sequential'
                    ? 'bg-white dark:bg-[#1E2430] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
                title="Assumes staggered motor starts (single largest motor inrush with running loads on)"
              >
                Sequential Start
              </button>
              <button
                onClick={() => onSequenceToggle('Simultaneous')}
                className={`py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  motorStartingSequence === 'Simultaneous'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
                title="Assumes all motors re-accelerate simultaneously across ATS transfer"
              >
                Simultaneous / ATS
              </button>
            </div>
          </div>

          {/* Headroom Reserve Slider */}
          {/* Headroom Reserve Slider & Diversity Checkbox */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>Operating Headroom:</span>
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {headroomPercent}% (Load: {100 - headroomPercent}%)
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="35"
                step="5"
                value={headroomPercent}
                onChange={(e) => onHeadroomChange(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={applyDiversity}
                  onChange={(e) => onDiversityToggle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500 cursor-pointer"
                />
                <span>Apply Demand Diversity</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sequence Mode Explanation Banner */}
        {motorStartingSequence === 'Simultaneous' && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>ATS Block Start Mode Active:</strong> Evaluating the inrush of ALL motors starting simultaneously across mains-to-generator transfer. Generator recommendation will size up to handle cumulative locked-rotor amps.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
