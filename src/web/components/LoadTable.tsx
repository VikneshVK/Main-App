import React from 'react';
import {
  Trash2,
  Edit2,
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { ProcessedLoadItem, LoadItem } from '../../engine';

interface LoadTableProps {
  processedItems: ProcessedLoadItem[];
  onEdit: (item: LoadItem) => void;
  onDelete: (id: string) => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onOpenAddModal: () => void;
}

export const LoadTable: React.FC<LoadTableProps> = ({
  processedItems,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onOpenAddModal,
}) => {
  if (processedItems.length === 0) {
    return (
      <div className="bg-white dark:bg-[#181D26] rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-8 text-center transition-colors">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center mb-3">
          <Zap className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
          No Equipment Added Yet
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
          Add loads using the visual presets above, or click below to enter custom equipment.
        </p>
        <button
          onClick={onOpenAddModal}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add First Load</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#181D26] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Configured Equipment List
          </h3>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {processedItems.reduce((acc, p) => acc + p.item.quantity, 0)} units total
          </span>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="py-3 px-4">Load Description</th>
              <th className="py-3 px-4">Qty / Rating</th>
              <th className="py-3 px-4">Starting Method</th>
              <th className="py-3 px-4 text-right">Running Load</th>
              <th className="py-3 px-4 text-center">Phase Audit</th>
              <th className="py-3 px-4 text-center">Data Confidence</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {processedItems.map((p) => {
              const item = p.item;
              const isTbd = item.confidence === 'Unknown_TBD';

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors ${
                    p.phaseStatus === 'Incompatible'
                      ? 'bg-red-50/40 dark:bg-red-950/20'
                      : isTbd || p.phaseStatus === 'Requires Verification'
                      ? 'bg-amber-50/30 dark:bg-amber-950/10'
                      : ''
                  }`}
                >
                  {/* Load Description */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-1.5">
                      <span>{item.category}</span>
                      {item.phase && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[10px] px-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {item.phase === 'three'
                              ? '3-Phase'
                              : item.phase === 'single'
                              ? '1-Phase'
                              : item.phase === 'any'
                              ? 'Universal'
                              : 'Phase Unspecified'}
                          </span>
                        </>
                      )}
                      {item.notes && (
                        <>
                          <span>•</span>
                          <span className="italic truncate max-w-[180px]">{item.notes}</span>
                        </>
                      )}
                    </div>
                    {p.phaseStatusReason && (
                      <div className={`text-[10px] mt-0.5 font-medium ${p.phaseStatus === 'Incompatible' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {p.phaseStatusReason}
                      </div>
                    )}
                  </td>

                  {/* Quantity & Rating */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition cursor-pointer"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        {isTbd ? 'HP unknown' : `× ${item.unitPower} ${item.powerUnit}`}
                      </span>
                    </div>
                  </td>

                  {/* Starting Method */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.isMotor ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {item.startingMethod} ({p.startingMultiplier}x)
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-[11px]">Resistive / Non-motor</span>
                    )}
                  </td>

                  {/* Calculated Running Load */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {isTbd ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400">TBD</span>
                    ) : (
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {p.effectiveRunningKw} kW
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {p.effectiveRunningKva} kVA ({p.currentAmps} A)
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Phase Compatibility Audit */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {p.phaseStatus === 'Incompatible' ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800"
                        title={p.phaseStatusReason}
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        Incompatible
                      </span>
                    ) : p.phaseStatus === 'Requires Verification' ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                        title={p.phaseStatusReason}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        Needs Verification
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        title="Confirmed compatible with active electrical system"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Compatible
                      </span>
                    )}
                  </td>

                  {/* Confidence Badge */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {isTbd ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ■ Info required
                      </span>
                    ) : item.confidence === 'Nameplate' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Nameplate data
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        Estimated
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                        title="Edit load"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                        title="Delete load"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
