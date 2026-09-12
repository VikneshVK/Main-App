import React, { useState } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';
import {
  LoadItem,
  LoadCategory,
  PowerUnit,
  StartingMethod,
  LoadConfidence,
  LoadPhase,
  STARTING_METHOD_DESCRIPTIONS,
} from '../../engine';

interface AddLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLoad: (item: LoadItem) => void;
  initialItem?: LoadItem | null;
}

export const AddLoadModal: React.FC<AddLoadModalProps> = ({
  isOpen,
  onClose,
  onSaveLoad,
  initialItem,
}) => {
  const [name, setName] = useState(initialItem?.name || '');
  const [category, setCategory] = useState<LoadCategory>(initialItem?.category || 'General');
  const [quantity, setQuantity] = useState(initialItem?.quantity || 1);
  const [unitPower, setUnitPower] = useState(initialItem?.unitPower ?? 1.5);
  const [powerUnit, setPowerUnit] = useState<PowerUnit>(initialItem?.powerUnit || 'kW');
  const [powerFactor, setPowerFactor] = useState(initialItem?.powerFactor || 0.85);
  const [phase, setPhase] = useState<LoadPhase>(
    initialItem?.phase || (initialItem ? (initialItem.isMotor ? 'unknown' : 'any') : 'unknown')
  );
  const [isMotor, setIsMotor] = useState(initialItem?.isMotor ?? false);
  const [startingMethod, setStartingMethod] = useState<StartingMethod>(
    initialItem?.startingMethod || 'None'
  );
  const [confidence, setConfidence] = useState<LoadConfidence>(
    initialItem?.confidence || 'Estimated'
  );
  const [efficiency, setEfficiency] = useState(initialItem?.efficiency ?? 0.85);
  const [customStartingMultiplier, setCustomStartingMultiplier] = useState<number | undefined>(
    initialItem?.customStartingMultiplier
  );
  const [nemaCodeLetter, setNemaCodeLetter] = useState<string>(initialItem?.nemaCodeLetter || '');
  const [notes, setNotes] = useState(initialItem?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: LoadItem = {
      id: initialItem?.id || `load-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      category,
      quantity: Math.max(1, quantity),
      unitPower: confidence === 'Unknown_TBD' ? 0 : Math.max(0, unitPower),
      powerUnit,
      powerFactor: Math.min(1.0, Math.max(0.1, powerFactor)),
      efficiency: isMotor ? Math.min(1.0, Math.max(0.5, efficiency)) : undefined,
      isMotor,
      startingMethod: isMotor ? startingMethod : 'None',
      customStartingMultiplier: isMotor && customStartingMultiplier && customStartingMultiplier > 0 ? customStartingMultiplier : undefined,
      nemaCodeLetter: isMotor && nemaCodeLetter ? nemaCodeLetter : undefined,
      confidence,
      notes: notes.trim() || undefined,
      phase,
    };

    onSaveLoad(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1A1F2B] w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {initialItem ? 'Edit Equipment Load' : 'Add Equipment Load'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Equipment Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Equipment / Machine Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 5 HP Groundwater Pump"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          {/* Category & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LoadCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
              >
                <option value="General">General</option>
                <option value="HVAC">HVAC / Air Conditioning</option>
                <option value="Motors">Motors & Pumps</option>
                <option value="Office">Office / IT</option>
                <option value="Lighting">Lighting</option>
                <option value="Industrial">Industrial Machinery</option>
                <option value="Appliances">Appliances / Pantry</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
          </div>

          {/* Confidence / Status Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Data Confidence / Source
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setConfidence('Estimated')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  confidence === 'Estimated'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Estimated
              </button>
              <button
                type="button"
                onClick={() => setConfidence('Nameplate')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  confidence === 'Nameplate'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Nameplate Data
              </button>
              <button
                type="button"
                onClick={() => setConfidence('Unknown_TBD')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  confidence === 'Unknown_TBD'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Unknown (TBD)
              </button>
            </div>
            {confidence === 'Unknown_TBD' && (
              <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                This load will be flagged as &quot;Information Required&quot; on the quotation.
              </p>
            )}
          </div>

          {/* Equipment Phase Configuration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Equipment Electrical Phase
              </label>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {phase === 'three' && '3-Phase 415V Supply'}
                {phase === 'single' && 'Single-Phase 230V Circuit'}
                {phase === 'any' && 'Universal / Balanced Across Phases'}
                {phase === 'unknown' && 'Phase Unconfirmed (Requires Site Check)'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPhase('three')}
                className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  phase === 'three'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                3-Phase
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase('single');
                  if (startingMethod === 'StarDelta') {
                    setStartingMethod('DOL');
                  }
                }}
                className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  phase === 'single'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Single-Phase
              </button>
              <button
                type="button"
                onClick={() => setPhase('any')}
                className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  phase === 'any'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Universal
              </button>
              <button
                type="button"
                onClick={() => setPhase('unknown')}
                className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  phase === 'unknown'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Unknown (TBD)
              </button>
            </div>
            {phase === 'unknown' && (
              <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Unconfirmed phase will be flagged as &quot;Requires Verification&quot; and docks quotation confidence.
              </p>
            )}
            {phase === 'three' && (
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                Requires 3-phase supply. Incompatible with 230V single-phase generator system.
              </p>
            )}
          </div>

          {/* Power Rating & Unit (Only if not Unknown_TBD) */}
          {confidence !== 'Unknown_TBD' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Unit Power Rating
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  value={unitPower}
                  onChange={(e) => setUnitPower(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Power Unit
                </label>
                <select
                  value={powerUnit}
                  onChange={(e) => {
                    const u = e.target.value as PowerUnit;
                    setPowerUnit(u);
                    if (u === 'HP') {
                      setIsMotor(true);
                      if (phase === 'any') setPhase('unknown');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                >
                  <option value="kW">kW (Active Power)</option>
                  <option value="kVA">kVA (Apparent Power)</option>
                  <option value="HP">HP (Mechanical Horsepower)</option>
                  <option value="W">Watts (W)</option>
                </select>
              </div>
            </div>
          )}

          {/* Power Factor & Motor Toggle */}
          <div className="space-y-3 pt-1 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Power Factor (PF): <span className="text-amber-500 font-bold">{powerFactor}</span>
              </label>
              <div className="flex gap-1">
                {[0.8, 0.85, 0.9, 0.95, 1.0].map((pf) => (
                  <button
                    key={pf}
                    type="button"
                    onClick={() => setPowerFactor(pf)}
                    className={`px-1.5 py-0.5 text-[10px] rounded border cursor-pointer ${
                      powerFactor === pf
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {pf}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.01"
              value={powerFactor}
              onChange={(e) => setPowerFactor(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          {/* Motor Specifics */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="isMotorCheck"
                checked={isMotor}
                onChange={(e) => {
                  setIsMotor(e.target.checked);
                  if (e.target.checked) {
                    if (startingMethod === 'None') {
                      setStartingMethod('DOL');
                    }
                    if (phase === 'any') {
                      setPhase('unknown');
                    }
                  }
                }}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500"
              />
              <label
                htmlFor="isMotorCheck"
                className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Is Inductive Motor Load (Requires Starting Inrush Calculation)
              </label>
            </div>

            {isMotor && (
              <div className="space-y-3 pl-6 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Starting Method
                  </label>
                  <select
                    value={startingMethod}
                    onChange={(e) => {
                      const method = e.target.value as StartingMethod;
                      setStartingMethod(method);
                      if (method === 'StarDelta' && phase === 'single') {
                        setPhase('three');
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                  >
                    <option value="DOL">Direct-On-Line (6.0x Starting Inrush)</option>
                    <option value="StarDelta" disabled={phase === 'single'}>
                      Star-Delta (3.0x Starting Inrush){phase === 'single' ? ' - 3-Phase Supply Only' : ''}
                    </option>
                    <option value="SoftStarter">Electronic Soft Starter (2.0x Starting Inrush)</option>
                    <option value="VFD">Variable Frequency Drive (1.2x Soft Ramp)</option>
                    <option value="Inverter">Inverter Driven / BLDC (1.2x Modulated)</option>
                    <option value="Conventional">Conventional AC Compressor (3.5x)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {STARTING_METHOD_DESCRIPTIONS[startingMethod as StartingMethod]}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Motor Efficiency (η): <span className="font-bold text-amber-500">{efficiency * 100}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.70"
                    max="0.95"
                    step="0.01"
                    value={efficiency}
                    onChange={(e) => setEfficiency(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200 dark:border-gray-700/60">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      NEMA Code Letter (Optional)
                    </label>
                    <select
                      value={nemaCodeLetter}
                      onChange={(e) => setNemaCodeLetter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white outline-hidden"
                    >
                      <option value="">Default (Code G - 6.0x)</option>
                      <option value="F">Code F (5.3x - Energy Efficient)</option>
                      <option value="G">Code G (6.0x - Standard Design B)</option>
                      <option value="H">Code H (6.7x - High Starting Torque)</option>
                      <option value="J">Code J (7.5x - Severe Inrush)</option>
                      <option value="K">Code K (8.5x - Submersible Borewell)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Custom Multiplier Override
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      placeholder="e.g. 5.5"
                      value={customStartingMultiplier ?? ''}
                      onChange={(e) =>
                        setCustomStartingMultiplier(
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Field Notes / Observations (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Located on 2nd floor, tested during site visit"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{initialItem ? 'Update Load' : 'Add to Sizing List'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
