import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check } from 'lucide-react';
import {
  LoadCategory,
  StartingMethod,
  FacilityType,
  FACILITY_PROFILES,
  STANDARD_STARTING_MULTIPLIERS,
} from '../../engine';

interface TuneFactorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityType: FacilityType;
  customDemandFactors: Partial<Record<LoadCategory, number>>;
  customStartingMultipliers: Partial<Record<StartingMethod, number>>;
  onSaveFactors: (
    demandFactors: Partial<Record<LoadCategory, number>>,
    startingMultipliers: Partial<Record<StartingMethod, number>>
  ) => void;
}

export const TuneFactorsModal: React.FC<TuneFactorsModalProps> = ({
  isOpen,
  onClose,
  facilityType,
  customDemandFactors,
  customStartingMultipliers,
  onSaveFactors,
}) => {
  const activeProfile = FACILITY_PROFILES[facilityType] || FACILITY_PROFILES.Office;

  const [demandFactors, setDemandFactors] = useState<Record<LoadCategory, number>>({
    ...activeProfile,
    ...customDemandFactors,
  });

  const [startingMultipliers, setStartingMultipliers] = useState<Record<StartingMethod, number>>({
    ...STANDARD_STARTING_MULTIPLIERS,
    ...customStartingMultipliers,
  });

  if (!isOpen) return null;

  const handleReset = () => {
    setDemandFactors({ ...activeProfile });
    setStartingMultipliers({ ...STANDARD_STARTING_MULTIPLIERS });
  };

  const handleSave = () => {
    onSaveFactors(demandFactors, startingMultipliers);
    onClose();
  };

  const categories: LoadCategory[] = [
    'Lighting',
    'HVAC',
    'Motors',
    'Office',
    'Industrial',
    'Appliances',
    'General',
  ];

  const methods: StartingMethod[] = [
    'DOL',
    'StarDelta',
    'SoftStarter',
    'VFD',
    'Inverter',
    'Conventional',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1A1F2B] w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Tune Demand & Starting Inrush Factors
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Facility Base: <strong className="text-amber-500">{facilityType}</strong> Profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliders Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Demand Factors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Category Diversity / Demand Factors
              </h3>
              <span className="text-[11px] text-gray-400">Coincidence loading (0.1 to 1.0)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{cat}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {Math.round(demandFactors[cat] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={demandFactors[cat]}
                    onChange={(e) =>
                      setDemandFactors((prev) => ({
                        ...prev,
                        [cat]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Starting Multipliers */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Motor Starting Inrush Multipliers
              </h3>
              <span className="text-[11px] text-gray-400">Multiples of full-load kVA</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {methods.map((m) => (
                <div
                  key={m}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{m}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {startingMultipliers[m]}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="8.0"
                    step="0.1"
                    value={startingMultipliers[m]}
                    onChange={(e) =>
                      setStartingMultipliers((prev) => ({
                        ...prev,
                        [m]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Apply Factors</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
