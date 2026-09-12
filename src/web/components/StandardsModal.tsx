import React from 'react';
import { X, BookOpen, ShieldAlert, ExternalLink, CheckCircle } from 'lucide-react';
import {
  ELECTRICAL_STANDARDS,
  NEMA_CODE_LETTERS,
  ENGINEERING_DISCLAIMER,
  CURRENT_ENGINE_VERSION,
} from '../../engine';

interface StandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandardsModal: React.FC<StandardsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1A1F2B] w-full max-w-3xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Electrical Engineering Standards & Citations
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Engine Ruleset Version: <strong className="text-amber-500 font-mono">{CURRENT_ENGINE_VERSION}</strong>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700 dark:text-gray-300">
          {/* Engineering Disclaimer Alert */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 dark:text-amber-200">
                Professional Engineering Reference Notice
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                {ENGINEERING_DISCLAIMER}
              </p>
            </div>
          </div>

          {/* Primary Standards Citations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Authoritative Reference Standards
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(ELECTRICAL_STANDARDS).map((std) => (
                <div
                  key={std.id}
                  className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20"
                >
                  <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                    <span>{std.standard}</span>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                      {std.section.split(':')[0]}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mt-0.5">
                    {std.title}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                    {std.summary}
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-gray-400 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>{std.urlOrRef}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NEMA MG-1 Table 10-22 Code Letters */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              NEMA MG 1-2016 Table 10-22: Locked-Rotor kVA/HP Multipliers
            </h3>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-2 px-3">Code Letter</th>
                    <th className="py-2 px-3">kVA / HP Range</th>
                    <th className="py-2 px-3">Typical Multiplier</th>
                    <th className="py-2 px-3">Application Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-mono text-[11px]">
                  {Object.values(NEMA_CODE_LETTERS).map((code) => (
                    <tr
                      key={code.letter}
                      className={
                        code.letter === 'G'
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 font-bold'
                          : ''
                      }
                    >
                      <td className="py-2 px-3 text-amber-600 dark:text-amber-400">
                        Code {code.letter} {code.letter === 'G' ? '(Default)' : ''}
                      </td>
                      <td className="py-2 px-3">
                        {code.minKvaPerHp} - {code.maxKvaPerHp}
                      </td>
                      <td className="py-2 px-3 font-bold">{code.typicalMultiplier}x</td>
                      <td className="py-2 px-3 font-sans text-gray-600 dark:text-gray-400">
                        {code.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 cursor-pointer hover:opacity-90 transition"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Close Standards Reference</span>
          </button>
        </div>
      </div>
    </div>
  );
};
