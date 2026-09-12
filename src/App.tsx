import React, { useState, useMemo, useEffect } from 'react';
import {
  calculateGeneratorSizing,
  LoadItem,
  PresetTemplate,
  FacilityType,
  MotorStartingSequence,
  LoadCategory,
  StartingMethod,
  ElectricalSystem,
  PhaseType,
} from './engine';
import { Navbar } from './web/components/Navbar';
import { ElectricalSystemCard } from './web/components/ElectricalSystemCard';
import { PresetsBar } from './web/components/PresetsBar';
import { LoadTable } from './web/components/LoadTable';
import { TelemetryCards } from './web/components/TelemetryCards';
import { RecommendationCard } from './web/components/RecommendationCard';
import { AddLoadModal } from './web/components/AddLoadModal';
import { StandardsModal } from './web/components/StandardsModal';
import { TuneFactorsModal } from './web/components/TuneFactorsModal';

const SPEC_SCENARIO_LOADS: LoadItem[] = [
  {
    id: 'spec-1',
    name: 'Workstations',
    category: 'Office',
    quantity: 15,
    unitPower: 300,
    powerUnit: 'W',
    powerFactor: 0.9,
    isMotor: false,
    startingMethod: 'None',
    confidence: 'Estimated',
    notes: 'Office desktop workstations',
  },
  {
    id: 'spec-2',
    name: 'Split AC',
    category: 'HVAC',
    quantity: 4,
    unitPower: 1.5,
    powerUnit: 'kW',
    powerFactor: 0.85,
    isMotor: true,
    startingMethod: 'Inverter',
    confidence: 'Estimated',
    notes: '1.5 Ton inverter split units',
  },
  {
    id: 'spec-3',
    name: 'Lights',
    category: 'Lighting',
    quantity: 10,
    unitPower: 20,
    powerUnit: 'W',
    powerFactor: 0.95,
    isMotor: false,
    startingMethod: 'None',
    confidence: 'Estimated',
    notes: 'LED 4ft battens',
  },
  {
    id: 'spec-4',
    name: 'Water motors (Groundwater / Sump)',
    category: 'Motors',
    quantity: 2,
    unitPower: 0,
    powerUnit: 'HP',
    powerFactor: 0.8,
    isMotor: true,
    startingMethod: 'DOL',
    confidence: 'Unknown_TBD',
    notes: 'Customer unaware of HP rating; flagged for site inspection',
  },
  {
    id: 'spec-5',
    name: 'Microwave',
    category: 'Appliances',
    quantity: 1,
    unitPower: 1.2,
    powerUnit: 'kW',
    powerFactor: 0.95,
    isMotor: false,
    startingMethod: 'None',
    confidence: 'Estimated',
  },
  {
    id: 'spec-6',
    name: 'Refrigerator',
    category: 'Appliances',
    quantity: 1,
    unitPower: 300,
    powerUnit: 'W',
    powerFactor: 0.8,
    isMotor: true,
    startingMethod: 'Inverter',
    confidence: 'Estimated',
  },
  {
    id: 'spec-7',
    name: 'Coffee maker',
    category: 'Appliances',
    quantity: 1,
    unitPower: 1.0,
    powerUnit: 'kW',
    powerFactor: 1.0,
    isMotor: false,
    startingMethod: 'None',
    confidence: 'Estimated',
  },
];

export const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load state - pre-populate with the PDF specification scenario
  const [loads, setLoads] = useState<LoadItem[]>(SPEC_SCENARIO_LOADS);

  // Electrical Supply configuration
  const [electricalSystem, setElectricalSystem] = useState<ElectricalSystem>({
    phase: 'three',
    voltage: 415,
    frequency: 50,
  });

  const handlePhaseChange = (phase: PhaseType) => {
    setElectricalSystem((prev) => ({
      ...prev,
      phase,
      voltage: phase === 'single' ? 230 : 415,
    }));
  };

  // Engine configuration options
  const [headroomPercent, setHeadroomPercent] = useState<number>(20);
  const [applyDiversity, setApplyDiversity] = useState<boolean>(true);
  const [facilityType, setFacilityType] = useState<FacilityType>('Office');
  const [motorStartingSequence, setMotorStartingSequence] =
    useState<MotorStartingSequence>('Sequential');

  // Custom Factor Tuning
  const [customDemandFactors, setCustomDemandFactors] = useState<
    Partial<Record<LoadCategory, number>>
  >({});
  const [customStartingMultipliers, setCustomStartingMultipliers] = useState<
    Partial<Record<StartingMethod, number>>
  >({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<LoadItem | null>(null);
  const [isStandardsOpen, setIsStandardsOpen] = useState<boolean>(false);
  const [isTuneFactorsOpen, setIsTuneFactorsOpen] = useState<boolean>(false);

  // Calculate sizing in real-time with zero lag
  const sizingResult = useMemo(() => {
    return calculateGeneratorSizing(loads, {
      headroomPercent,
      applyDiversity,
      facilityType,
      motorStartingSequence,
      customDemandFactors,
      customStartingMultipliers,
      electricalSystem,
    });
  }, [
    loads,
    headroomPercent,
    applyDiversity,
    facilityType,
    motorStartingSequence,
    customDemandFactors,
    customStartingMultipliers,
    electricalSystem,
  ]);

  // Handlers
  const handleAddPreset = (preset: PresetTemplate) => {
    const newItem: LoadItem = {
      id: `load-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      category: preset.category,
      quantity: preset.defaultQty,
      unitPower: preset.unitPower,
      powerUnit: preset.powerUnit,
      powerFactor: preset.powerFactor,
      efficiency: preset.efficiency,
      isMotor: preset.isMotor,
      startingMethod: preset.startingMethod,
      confidence: preset.confidence,
      notes: preset.notes,
      phase: preset.phase,
    };
    setLoads((prev) => [...prev, newItem]);
  };

  const handleSaveLoad = (item: LoadItem) => {
    setLoads((prev) => {
      const exists = prev.some((l) => l.id === item.id);
      if (exists) {
        return prev.map((l) => (l.id === item.id ? item : l));
      }
      return [...prev, item];
    });
  };

  const handleDeleteLoad = (id: string) => {
    setLoads((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleDeleteLoad(id);
      return;
    }
    setLoads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: newQty } : l))
    );
  };

  const handleEditLoad = (item: LoadItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleLoadSpecScenario = () => {
    setLoads(SPEC_SCENARIO_LOADS);
  };

  const handleClearAll = () => {
    setLoads([]);
  };

  const handleSaveTunedFactors = (
    demand: Partial<Record<LoadCategory, number>>,
    multipliers: Partial<Record<StartingMethod, number>>
  ) => {
    setCustomDemandFactors(demand);
    setCustomStartingMultipliers(multipliers);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#11141A] transition-colors duration-200">
      {/* Header */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLoadSpecScenario={handleLoadSpecScenario}
        onClearAll={handleClearAll}
        onOpenStandards={() => setIsStandardsOpen(true)}
        onOpenTuneFactors={() => setIsTuneFactorsOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Electrical System Configuration */}
        <ElectricalSystemCard
          electricalSystem={electricalSystem}
          onPhaseChange={handlePhaseChange}
          sizingResult={sizingResult}
        />

        {/* Presets Visual Bar */}
        <PresetsBar
          onAddPreset={handleAddPreset}
          onOpenCustomModal={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
        />

        {/* Telemetry & Controls Dashboard */}
        <TelemetryCards
          sizingResult={sizingResult}
          headroomPercent={headroomPercent}
          applyDiversity={applyDiversity}
          facilityType={facilityType}
          motorStartingSequence={motorStartingSequence}
          onHeadroomChange={setHeadroomPercent}
          onDiversityToggle={setApplyDiversity}
          onFacilityChange={setFacilityType}
          onSequenceToggle={setMotorStartingSequence}
        />

        {/* Generator Recommendation Card & Load Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Top: Recommendation & Rationale (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <RecommendationCard
              sizingResult={sizingResult}
              onSwitchToThreePhase={() => handlePhaseChange('three')}
            />
          </div>

          {/* Right: Load Summary Table (7 cols) */}
          <div className="lg:col-span-7">
            <LoadTable
              processedItems={sizingResult.breakdown}
              onEdit={handleEditLoad}
              onDelete={handleDeleteLoad}
              onUpdateQuantity={handleUpdateQuantity}
              onOpenAddModal={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
            />
          </div>
        </div>
      </main>

      {/* Add / Edit Load Modal */}
      <AddLoadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSaveLoad={handleSaveLoad}
        initialItem={editingItem}
      />

      {/* Standards & Citations Reference Modal */}
      <StandardsModal
        isOpen={isStandardsOpen}
        onClose={() => setIsStandardsOpen(false)}
      />

      {/* Tune Factors Modal */}
      <TuneFactorsModal
        isOpen={isTuneFactorsOpen}
        onClose={() => setIsTuneFactorsOpen(false)}
        facilityType={facilityType}
        customDemandFactors={customDemandFactors}
        customStartingMultipliers={customStartingMultipliers}
        onSaveFactors={handleSaveTunedFactors}
      />
    </div>
  );
};
