import React from 'react';
import {
  Laptop,
  Wind,
  Lightbulb,
  Fan,
  Droplets,
  HelpCircle,
  Flame,
  Coffee,
  Gauge,
  Cpu,
  Plus,
} from 'lucide-react';
import { COMMON_LOAD_PRESETS, PresetTemplate } from '../../engine';

interface PresetsBarProps {
  onAddPreset: (preset: PresetTemplate) => void;
  onOpenCustomModal: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Computer: Laptop,
  Wind: Wind,
  Lightbulb: Lightbulb,
  Fan: Fan,
  Droplets: Droplets,
  HelpCircle: HelpCircle,
  Flame: Flame,
  Coffee: Coffee,
  Gauge: Gauge,
  Cpu: Cpu,
};

export const PresetsBar: React.FC<PresetsBarProps> = ({
  onAddPreset,
  onOpenCustomModal,
}) => {
  return (
    <div className="bg-white dark:bg-[#181D26] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Quick Add Visual Presets
        </h3>
        <button
          onClick={onOpenCustomModal}
          className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Equipment</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {COMMON_LOAD_PRESETS.map((preset, idx) => {
          const Icon = ICON_MAP[preset.iconName] || Plus;
          const isTbd = preset.confidence === 'Unknown_TBD';

          return (
            <button
              key={idx}
              onClick={() => onAddPreset(preset)}
              className={`group flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer active:scale-95 ${
                isTbd
                  ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500'
                  : 'border-gray-200 dark:border-gray-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isTbd
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 group-hover:bg-amber-500 group-hover:text-white transition-colors'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {preset.name.split(' (')[0]}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {isTbd ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Unknown TBD</span>
                  ) : (
                    `${preset.unitPower} ${preset.powerUnit}`
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
