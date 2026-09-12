import React from 'react';
import {
  Zap,
  Sun,
  Moon,
  RotateCcw,
  PlayCircle,
  BookOpen,
  Sliders,
} from 'lucide-react';
import { CURRENT_ENGINE_VERSION } from '../../engine';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLoadSpecScenario: () => void;
  onClearAll: () => void;
  onOpenStandards: () => void;
  onOpenTuneFactors: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  onLoadSpecScenario,
  onClearAll,
  onOpenStandards,
  onOpenTuneFactors,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#151922]/95 backdrop-blur-md px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Engine Version */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">
                Gen<span className="text-amber-500">Quote</span>
              </span>
              <button
                onClick={onOpenStandards}
                className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1"
                title="Click to view IEEE 399 / NEMA MG-1 Standards Citations"
              >
                <span>{CURRENT_ENGINE_VERSION}</span>
                <BookOpen className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Electrical Load Sizing Engine & Stated Assumptions
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Standards Reference Button */}
          <button
            onClick={onOpenStandards}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Standards & Citations</span>
          </button>

          {/* Tune Factors Button */}
          <button
            onClick={onOpenTuneFactors}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-500" />
            <span>Tune Factors</span>
          </button>

          {/* Load Spec Scenario */}
          <button
            onClick={onLoadSpecScenario}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/30 transition active:scale-95 cursor-pointer"
            title="Populate 15 Workstations, 4 ACs, 10 Lights, and 2 Unknown Water Motors from the PDF spec"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Load Spec Scenario</span>
          </button>

          {/* Reset */}
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            title="Clear all loads"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
          </button>
        </div>
      </div>
    </header>
  );
};
