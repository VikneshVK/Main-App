import { describe, it, expect } from 'vitest';
import {
  calculateGeneratorSizing,
  normalizeToKw,
  kwToKva,
  vectorPowerSum,
  calculateStartingKva,
  calculateCurrentAmps,
  currentToKva,
  LoadItem,
  GeneratorModel,
  CURRENT_ENGINE_VERSION,
  PRODUCTION_THREE_PHASE_CATALOG,
  PROVISIONAL_SINGLE_PHASE_CATALOG,
} from '../index';

describe('GenQuote Load Calculation Engine (IEEE 399 / NEMA MG-1 Grounded)', () => {
  describe('Electrical Math & Conversions', () => {
    it('accurately converts Watts to kW', () => {
      expect(normalizeToKw(300, 'W')).toBe(0.3);
      expect(normalizeToKw(1200, 'W')).toBe(1.2);
    });

    it('accurately converts HP to electrical input kW accounting for motor efficiency', () => {
      // 10 HP * 0.7457 / 0.85 = ~8.7729 kW
      const kw = normalizeToKw(10, 'HP', 0.8, 0.85);
      expect(kw).toBeCloseTo(8.773, 2);
    });

    it('accurately converts kW to kVA using Power Factor', () => {
      expect(kwToKva(80, 0.8)).toBe(100);
      expect(kwToKva(10, 1.0)).toBe(10);
    });

    it('computes true orthogonal vector power sum and system PF', () => {
      const result = vectorPowerSum([
        { kw: 3, kvar: 4 },
        { kw: 3, kvar: 4 },
      ]);
      expect(result.totalKw).toBe(6);
      expect(result.totalKvar).toBe(8);
      expect(result.totalKva).toBe(10);
      expect(result.systemPf).toBe(0.6);
    });
  });

  describe('Motor Starting Multipliers & NEMA Code Letters', () => {
    it('calculates DOL starting surge at 6.0x (IEEE 399 / NEMA Code G)', () => {
      const runningKva = 10;
      const startingKva = calculateStartingKva(runningKva, 6.0);
      expect(startingKva).toBe(60);
    });

    it('calculates Star-Delta starting surge at 3.0x (IEC 60947-4-1)', () => {
      const runningKva = 10;
      const startingKva = calculateStartingKva(runningKva, 3.0);
      expect(startingKva).toBe(30);
    });

    it('calculates VFD starting surge at 1.2x', () => {
      const runningKva = 10;
      const startingKva = calculateStartingKva(runningKva, 1.2);
      expect(startingKva).toBe(12);
    });

    it('honors customStartingMultiplier override on a load item', () => {
      const customMotor: LoadItem = {
        id: 'cust-1',
        name: 'Blower Fan',
        category: 'Motors',
        quantity: 1,
        unitPower: 10,
        powerUnit: 'HP',
        powerFactor: 0.8,
        isMotor: true,
        startingMethod: 'DOL',
        customStartingMultiplier: 4.8, // Custom override instead of 6.0
        confidence: 'Nameplate',
      };

      const result = calculateGeneratorSizing([customMotor]);
      expect(result.breakdown[0].startingMultiplier).toBe(4.8);
    });
  });

  describe('Motor Starting Sequence: Sequential vs Simultaneous ATS Block Start', () => {
    const multiMotorSite: LoadItem[] = [
      {
        id: 'pump-1',
        name: 'Chilled Water Pump 1',
        category: 'Motors',
        quantity: 1,
        unitPower: 15, // 15 HP = ~13.16 kW, running ~16.4 kVA, DOL surge ~98.7 kVA
        powerUnit: 'HP',
        powerFactor: 0.8,
        isMotor: true,
        startingMethod: 'DOL',
        confidence: 'Nameplate',
      },
      {
        id: 'pump-2',
        name: 'Chilled Water Pump 2',
        category: 'Motors',
        quantity: 1,
        unitPower: 15,
        powerUnit: 'HP',
        powerFactor: 0.8,
        isMotor: true,
        startingMethod: 'DOL',
        confidence: 'Nameplate',
      },
      {
        id: 'lights',
        name: 'Basement Lights',
        category: 'Lighting',
        quantity: 50,
        unitPower: 20,
        powerUnit: 'W',
        powerFactor: 0.95,
        isMotor: false,
        startingMethod: 'None',
        confidence: 'Nameplate',
      },
    ];

    it('differentiates between Sequential start and Simultaneous ATS block start', () => {
      const sequentialResult = calculateGeneratorSizing(multiMotorSite, {
        motorStartingSequence: 'Sequential',
      });

      const simultaneousResult = calculateGeneratorSizing(multiMotorSite, {
        motorStartingSequence: 'Simultaneous',
      });

      // Sequential assumes 1 motor starts while other is running
      // Simultaneous assumes BOTH motors start together across ATS
      expect(simultaneousResult.summary.peakTransientKva).toBeGreaterThan(
        sequentialResult.summary.peakTransientKva
      );

      // Verify stated disclosures state the exact assumption
      expect(
        sequentialResult.summary.statedAssumptions.some((a) =>
          a.includes('Sequential Start')
        )
      ).toBe(true);

      expect(
        simultaneousResult.summary.statedAssumptions.some((a) =>
          a.includes('Simultaneous / ATS Block Start')
        )
      ).toBe(true);
    });
  });

  describe('Engine Versioning & Audit Ruleset Snapshots', () => {
    it('stamps engine version and generates an immutable snapshot', () => {
      const result = calculateGeneratorSizing([]);
      
      expect(result.summary.engineVersion).toBe(CURRENT_ENGINE_VERSION);
      expect(result.summary.rulesetSnapshot).toBeDefined();
      expect(result.summary.rulesetSnapshot.engineVersion).toBe(CURRENT_ENGINE_VERSION);
      expect(result.summary.rulesetSnapshot.standardsReference).toContain('IEEE Std 399-1997');
      expect(result.summary.rulesetSnapshot.activeStartingMultipliers.DOL).toBe(6.0);
    });
  });

  describe('Facility Profiles & Editable Diversity', () => {
    const mixedLoad: LoadItem[] = [
      {
        id: '1',
        name: 'Workstations',
        category: 'Office',
        quantity: 20,
        unitPower: 300,
        powerUnit: 'W',
        powerFactor: 0.9,
        isMotor: false,
        startingMethod: 'None',
        confidence: 'Estimated',
      },
      {
        id: '2',
        name: 'Factory Motors',
        category: 'Industrial',
        quantity: 2,
        unitPower: 10,
        powerUnit: 'kW',
        powerFactor: 0.85,
        isMotor: true,
        startingMethod: 'StarDelta',
        confidence: 'Estimated',
      },
    ];

    it('adjusts diversified demand according to facility profile', () => {
      const officeResult = calculateGeneratorSizing(mixedLoad, { facilityType: 'Office' });
      const industrialResult = calculateGeneratorSizing(mixedLoad, { facilityType: 'Industrial' });

      expect(officeResult.summary.totalDiversifiedKw).not.toBe(
        industrialResult.summary.totalDiversifiedKw
      );
    });
  });

  describe('Specification Real-World Scenario (Page 4 & 5 of Spec)', () => {
    const specLoads: LoadItem[] = [
      {
        id: '1',
        name: 'Workstations',
        category: 'Office',
        quantity: 15,
        unitPower: 300,
        powerUnit: 'W',
        powerFactor: 0.9,
        isMotor: false,
        startingMethod: 'None',
        confidence: 'Estimated',
      },
      {
        id: '2',
        name: 'Split AC',
        category: 'HVAC',
        quantity: 4,
        unitPower: 1.5,
        powerUnit: 'kW',
        powerFactor: 0.85,
        isMotor: true,
        startingMethod: 'Inverter',
        confidence: 'Estimated',
      },
      {
        id: '3',
        name: 'Lights',
        category: 'Lighting',
        quantity: 10,
        unitPower: 20,
        powerUnit: 'W',
        powerFactor: 0.95,
        isMotor: false,
        startingMethod: 'None',
        confidence: 'Estimated',
      },
      {
        id: '4',
        name: 'Water Motors',
        category: 'Motors',
        quantity: 2,
        unitPower: 0,
        powerUnit: 'HP',
        powerFactor: 0.8,
        isMotor: true,
        startingMethod: 'DOL',
        confidence: 'Unknown_TBD',
      },
      {
        id: '5',
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
        id: '6',
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
        id: '7',
        name: 'Coffee Maker',
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

    it('correctly tracks and flags the 2 unknown water motors with stated caution', () => {
      const result = calculateGeneratorSizing(specLoads);
      
      expect(result.summary.unknownLoadsCount).toBe(2);
      expect(result.summary.unknownLoadNames).toContain('Water Motors');
      expect(result.summary.confidence).toBe('Low');
      expect(result.summary.statedAssumptions.some((a) => a.includes('unconfirmed equipment'))).toBe(true);
    });

    it('calculates running load for all known equipment', () => {
      const result = calculateGeneratorSizing(specLoads);
      expect(result.summary.totalConnectedKw).toBeCloseTo(13.2, 1);
      expect(result.summary.totalDiversifiedKw).toBeGreaterThan(0);
      expect(result.summary.recommendedGenerator).not.toBeNull();
    });
  });

  describe('Generator Headroom & Continuous Operating Margin Audit', () => {
    const testGen15With12Prime: GeneratorModel = {
      id: 'test-gen-15-12',
      modelName: 'DG-15 kVA (12 kVA Prime)',
      manufacturer: 'PowerGen',
      primeKva: 12,
      standbyKva: 15,
      primeKw: 9.6,
      phase: 3,
      supportedPhases: ['three'],
      catalogStatus: 'production_verified',
      voltage: '415V 3-Phase',
      transientCapacityKva: 24,
      isActive: true,
    };

    const testGen100: GeneratorModel = {
      id: 'test-gen-100',
      modelName: 'DG-100 kVA',
      manufacturer: 'PowerGen',
      primeKva: 100,
      standbyKva: 110,
      primeKw: 80,
      phase: 3,
      supportedPhases: ['three'],
      catalogStatus: 'production_verified',
      voltage: '415V 3-Phase',
      transientCapacityKva: 190,
      isActive: true,
    };

    const createPureLoad = (kva: number): LoadItem => ({
      id: `load-${kva}`,
      name: `${kva} kVA AC Test Load (PF 0.8)`,
      category: 'Custom',
      quantity: 1,
      unitPower: kva,
      powerUnit: 'kVA',
      powerFactor: 0.8,
      isMotor: false,
      startingMethod: 'None',
      confidence: 'Nameplate',
      demandFactor: 1.0,
    });

    it('Test 1: 15 kVA generator with 12 kVA Prime and 7.5 kVA demand at 20% headroom', () => {
      const result = calculateGeneratorSizing(
        [createPureLoad(7.5)],
        { headroomPercent: 20 },
        [testGen15With12Prime]
      );

      expect(result.summary.recommendedGenerator?.primeKva).toBe(12);
      expect(result.summary.continuousOperatingLimitKva).toBe(9.6);
      expect(result.summary.continuousLoadUtilizationPercent).toBe(62.5);
      expect(result.summary.operatingMarginKva).toBe(2.1);
      expect(result.summary.operatingMarginPercent).toBe(17.5);

      // Verify rationale matches requested format and eliminates misleading 50% claim
      expect(
        result.summary.rationale.some((r) =>
          r.includes(
            'Operates at 62.5% of Prime capacity, leaving 2.1 kVA before the 80% continuous operating limit.'
          )
        )
      ).toBe(true);

      expect(
        result.summary.rationale.some((r) => r.includes('Provides 50% operating headroom'))
      ).toBe(false);
    });

    it('Test 2: Demand exactly at 80% of Prime (80 kVA on 100 kVA Prime)', () => {
      const result = calculateGeneratorSizing(
        [createPureLoad(80)],
        { headroomPercent: 20 },
        [testGen100]
      );

      expect(result.summary.continuousOperatingLimitKva).toBe(80);
      expect(result.summary.continuousLoadUtilizationPercent).toBe(80);
      expect(result.summary.operatingMarginKva).toBe(0);
      expect(
        result.summary.rationale.some((r) =>
          r.includes(
            'Operates at 80% of Prime capacity, exactly matching the 80% continuous operating limit.'
          )
        )
      ).toBe(true);
    });

    it('Test 3: Demand above 80% of Prime (85 kVA on 100 kVA Prime)', () => {
      const result = calculateGeneratorSizing(
        [createPureLoad(85)],
        { headroomPercent: 20 },
        [testGen100]
      );

      expect(result.summary.continuousOperatingLimitKva).toBe(80);
      expect(result.summary.continuousLoadUtilizationPercent).toBe(85);
      expect(result.summary.operatingMarginKva).toBe(-5);
      expect(
        result.summary.rationale.some((r) =>
          r.includes(
            'Operates at 85% of Prime capacity, exceeding the 80% continuous operating limit by 5 kVA.'
          )
        )
      ).toBe(true);

      expect(
        result.summary.warnings.some((w) =>
          w.includes('exceeds the 80% continuous limit')
        )
      ).toBe(true);
    });

    it('Test 4: Different headroom settings (10%, 20%, and 30% with 60 kVA demand on 100 kVA Prime)', () => {
      // At 10% headroom -> continuous limit = 90 kVA (90%), margin = 30 kVA
      const res10 = calculateGeneratorSizing(
        [createPureLoad(60)],
        { headroomPercent: 10 },
        [testGen100]
      );
      expect(res10.summary.continuousOperatingLimitKva).toBe(90);
      expect(res10.summary.operatingMarginKva).toBe(30);
      expect(res10.summary.continuousLoadUtilizationPercent).toBe(60);
      expect(
        res10.summary.rationale.some((r) =>
          r.includes(
            'Operates at 60% of Prime capacity, leaving 30 kVA before the 90% continuous operating limit.'
          )
        )
      ).toBe(true);

      // At 20% headroom -> continuous limit = 80 kVA (80%), margin = 20 kVA
      const res20 = calculateGeneratorSizing(
        [createPureLoad(60)],
        { headroomPercent: 20 },
        [testGen100]
      );
      expect(res20.summary.continuousOperatingLimitKva).toBe(80);
      expect(res20.summary.operatingMarginKva).toBe(20);
      expect(res20.summary.continuousLoadUtilizationPercent).toBe(60);
      expect(
        res20.summary.rationale.some((r) =>
          r.includes(
            'Operates at 60% of Prime capacity, leaving 20 kVA before the 80% continuous operating limit.'
          )
        )
      ).toBe(true);

      // At 30% headroom -> continuous limit = 70 kVA (70%), margin = 10 kVA
      const res30 = calculateGeneratorSizing(
        [createPureLoad(60)],
        { headroomPercent: 30 },
        [testGen100]
      );
      expect(res30.summary.continuousOperatingLimitKva).toBe(70);
      expect(res30.summary.operatingMarginKva).toBe(10);
      expect(res30.summary.continuousLoadUtilizationPercent).toBe(60);
      expect(
        res30.summary.rationale.some((r) =>
          r.includes(
            'Operates at 60% of Prime capacity, leaving 10 kVA before the 70% continuous operating limit.'
          )
        )
      ).toBe(true);
    });
  });

  describe('Dual Prime kW and Prime kVA Qualification Audit (Audit Test 2 Resolution)', () => {
    const gen20kVa: GeneratorModel = {
      id: 'gen-20',
      modelName: 'DG-20 kVA',
      manufacturer: 'PowerGen',
      primeKva: 20,
      standbyKva: 22,
      primeKw: 16,
      ratedPowerFactor: 0.8,
      phase: 3,
      supportedPhases: ['three'],
      catalogStatus: 'production_verified',
      voltage: '415V 3-Phase',
      transientCapacityKva: 36,
      isActive: true,
    };

    const gen25kVa: GeneratorModel = {
      id: 'gen-25',
      modelName: 'DG-25 kVA',
      manufacturer: 'PowerGen',
      primeKva: 25,
      standbyKva: 27.5,
      primeKw: 20,
      ratedPowerFactor: 0.8,
      phase: 3,
      supportedPhases: ['three'],
      catalogStatus: 'production_verified',
      voltage: '415V 3-Phase',
      transientCapacityKva: 46,
      isActive: true,
    };

    const catalog20And25 = [gen20kVa, gen25kVa];

    it('Scenario 1: Below continuous operating limit -> PASSES and selects generator', () => {
      // 12.0 kW load on 20 kVA / 16 kW generator with 20% headroom
      // Continuous limit = 16 * 0.80 = 12.8 kW. Operating load 12.0 kW < 12.8 kW -> PASSES.
      const load: LoadItem[] = [
        {
          id: 'load-below',
          name: '12 kW Load (PF 0.8)',
          category: 'Custom',
          quantity: 1,
          unitPower: 12,
          powerUnit: 'kW',
          powerFactor: 0.8,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          demandFactor: 1.0,
        },
      ];

      const result = calculateGeneratorSizing(load, { headroomPercent: 20 }, catalog20And25);
      expect(result.summary.recommendedGenerator?.id).toBe('gen-20');
      expect(result.summary.continuousOperatingLimitKw).toBe(12.8);
      expect(result.summary.operatingMarginKw).toBe(0.8);
      expect(result.summary.continuousLoadUtilizationKwPercent).toBe(75);
    });

    it('Scenario 2: Exactly at continuous operating limit -> PASSES and selects generator', () => {
      // Exactly 12.8 kW load on 20 kVA / 16 kW generator with 20% headroom
      // Continuous limit = 12.8 kW. Operating load = 12.8 kW -> Margin = 0.0 kW -> PASSES.
      const load: LoadItem[] = [
        {
          id: 'load-exact',
          name: '12.8 kW Load (PF 0.8)',
          category: 'Custom',
          quantity: 1,
          unitPower: 12.8,
          powerUnit: 'kW',
          powerFactor: 0.8,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          demandFactor: 1.0,
        },
      ];

      const result = calculateGeneratorSizing(load, { headroomPercent: 20 }, catalog20And25);
      expect(result.summary.recommendedGenerator?.id).toBe('gen-20');
      expect(result.summary.continuousOperatingLimitKw).toBe(12.8);
      expect(result.summary.operatingMarginKw).toBe(0);
      expect(result.summary.continuousLoadUtilizationKwPercent).toBe(80);
    });

    it('Scenario 3: Above continuous operating limit -> FAILS and steps up to next generator size', () => {
      // 12.81 kW load on 20 kVA / 16 kW generator with 20% headroom
      // Exceeds 12.80 kW continuous limit -> gen-20 is disqualified; steps up to gen-25 (continuous limit 16.0 kW).
      const load: LoadItem[] = [
        {
          id: 'load-above',
          name: '12.81 kW Load (PF 0.8)',
          category: 'Custom',
          quantity: 1,
          unitPower: 12.81,
          powerUnit: 'kW',
          powerFactor: 0.8,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          demandFactor: 1.0,
        },
      ];

      const result = calculateGeneratorSizing(load, { headroomPercent: 20 }, catalog20And25);
      expect(result.summary.recommendedGenerator?.id).toBe('gen-25');
      expect(result.summary.continuousOperatingLimitKw).toBe(16.0);
      expect(result.summary.operatingMarginKw).toBeGreaterThan(0);
    });

    it('Scenario 4: kW vs kVA unit consistency (high PF vs low PF governing constraints)', () => {
      // High PF case: 15 kW at PF 1.0.
      // S = 15 kVA, P = 15 kW.
      // At 20% headroom: requiredPrimeKva = 15 / 0.8 = 18.75 kVA.
      // requiredPrimeKw = 15 / 0.8 = 18.75 kW.
      // gen-20 has primeKva = 20 (>= 18.75) but primeKw = 16 (< 18.75).
      // Active power (kW) governs and disqualifies gen-20 even though kVA would fit.
      const highPfLoad: LoadItem[] = [
        {
          id: 'high-pf',
          name: 'High PF Load',
          category: 'Custom',
          quantity: 1,
          unitPower: 15,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          demandFactor: 1.0,
        },
      ];

      const highPfResult = calculateGeneratorSizing(highPfLoad, { headroomPercent: 20 }, catalog20And25);
      expect(highPfResult.summary.recommendedGenerator?.id).toBe('gen-25');
      expect(highPfResult.summary.governingConstraint).toBe('kW');
      expect(highPfResult.summary.continuousLoadUtilizationKwPercent).toBeGreaterThan(
        highPfResult.summary.continuousLoadUtilizationPercent
      );

      // Low PF case: 10 kW at PF 0.5.
      // P = 10 kW, S = 20 kVA.
      // At 20% headroom: requiredPrimeKw = 10 / 0.8 = 12.5 kW.
      // requiredPrimeKva = 20 / 0.8 = 25.0 kVA.
      // gen-20 has primeKw = 16 (>= 12.5) but primeKva = 20 (< 25.0).
      // Apparent power (kVA) governs and disqualifies gen-20.
      const lowPfLoad: LoadItem[] = [
        {
          id: 'low-pf',
          name: 'Low PF Load',
          category: 'Custom',
          quantity: 1,
          unitPower: 10,
          powerUnit: 'kW',
          powerFactor: 0.5,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          demandFactor: 1.0,
        },
      ];

      const lowPfResult = calculateGeneratorSizing(lowPfLoad, { headroomPercent: 20 }, catalog20And25);
      expect(lowPfResult.summary.recommendedGenerator?.id).toBe('gen-25');
      expect(lowPfResult.summary.governingConstraint).toBe('kVA');
      expect(lowPfResult.summary.continuousLoadUtilizationPercent).toBeGreaterThan(
        lowPfResult.summary.continuousLoadUtilizationKwPercent
      );
    });

    it('Scenario 5: Exact Test 2 Case - Disqualifies 20 kVA and recommends 25 kVA generator', () => {
      // Test 2 Case specification:
      // Load 1: 10 kW, PF 1.00, General (Office), Non-motor
      // Load 2: 10 kW, PF 0.80, General (Office), Non-motor
      // Office profile (General demand factor = 0.75), Diversity ON, Headroom = 20%, Sequential Start
      const test2Loads: LoadItem[] = [
        {
          id: 'test2-load-1',
          name: 'General Resistive Equipment',
          category: 'General',
          quantity: 1,
          unitPower: 10,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
        },
        {
          id: 'test2-load-2',
          name: 'General Inductive Equipment',
          category: 'General',
          quantity: 1,
          unitPower: 10,
          powerUnit: 'kW',
          powerFactor: 0.8,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
        },
      ];

      const result = calculateGeneratorSizing(test2Loads, {
        facilityType: 'Office',
        applyDiversity: true,
        headroomPercent: 20,
        motorStartingSequence: 'Sequential',
      });

      // 1. Verify electrical math is strictly preserved
      expect(result.summary.totalConnectedKw).toBe(20.0);
      expect(result.summary.totalConnectedKva).toBe(22.5);
      expect(result.summary.totalDiversifiedKw).toBe(15.0);
      expect(result.summary.totalDiversifiedKvar).toBe(5.63);
      expect(result.summary.totalDiversifiedKva).toBe(16.02);
      expect(result.summary.systemPowerFactor).toBe(0.936);

      // 2. Verify generator qualification
      // 20 kVA DG continuous limits at 20% headroom: 16 kW * 0.80 = 12.80 kW; 20 kVA * 0.80 = 16.00 kVA.
      // Demand (15.00 kW, 16.02 kVA) exceeds BOTH limits.
      // Therefore, 20 kVA generator is disqualified.
      expect(result.summary.recommendedGenerator?.id).not.toBe('gen-20');
      expect(result.summary.recommendedGenerator?.primeKva).toBe(25);
      expect(result.summary.recommendedGenerator?.modelName).toContain('25 kVA');

      // 3. Verify continuous limits of recommended 25 kVA generator
      // gen-25 has Prime 25 kVA / 20 kW. Continuous limits: 20.00 kVA / 16.00 kW.
      expect(result.summary.continuousOperatingLimitKw).toBe(16.0);
      expect(result.summary.continuousOperatingLimitKva).toBe(20.0);
      expect(result.summary.operatingMarginKw).toBe(1.0); // 16.0 - 15.0
      expect(result.summary.operatingMarginKva).toBe(3.98); // 20.0 - 16.02
      expect(result.summary.continuousLoadUtilizationKwPercent).toBe(75.0); // 15 / 20 * 100
      expect(result.summary.continuousLoadUtilizationPercent).toBe(64.1); // 16.02 / 25 * 100
      expect(result.summary.governingConstraint).toBe('kW');

      // 4. Verify Alternative Generator Qualification Audit
      // 20 kVA generator fails continuous criteria and must NOT be labelled Minimum Acceptable
      expect(result.summary.minimumAcceptableGenerator).toBeNull();
      expect(result.summary.undersizedGenerator?.id).toBe('gen-20');
      expect(result.summary.alternativeComparisons.lower).toBeDefined();
      expect(result.summary.alternativeComparisons.lower?.qualifies).toBe(false);
      expect(result.summary.alternativeComparisons.lower?.label).toBe('Undersized / Not Recommended');
      expect(result.summary.alternativeComparisons.lower?.failureReason).toContain(
        'Exceeds 80% continuous engine limit by 2.2 kW'
      );
      // All displayed operating margins must respect the 80% continuous Prime limits
      expect(result.summary.alternativeComparisons.lower?.operatingMarginKw).toBe(-2.2);
      expect(result.summary.alternativeComparisons.lower?.operatingMarginKva).toBe(-0.02);

      // Heavy Duty (30 kVA) margins respect 80% continuous Prime limits (24 kW / 30 kVA limit: 19.2 kW / 24 kVA)
      expect(result.summary.alternativeComparisons.heavyDuty?.generator.primeKva).toBe(30);
      expect(result.summary.alternativeComparisons.heavyDuty?.qualifies).toBe(true);
      expect(result.summary.alternativeComparisons.heavyDuty?.operatingMarginKw).toBe(4.2); // 19.2 - 15.0
      expect(result.summary.alternativeComparisons.heavyDuty?.operatingMarginKva).toBe(7.98); // 24.0 - 16.02
    });

    it('Scenario 6: Alternative Generator Qualification - Only labels Minimum Acceptable if it passes continuous limits', () => {
      // Create a test where smaller generator passes mandatory continuous limits
      // e.g. 8 kW load at 0.8 PF (Demand: 8 kW / 10 kVA). Headroom = 20% (Continuous limit = 80%).
      // Required: 8 / 0.8 = 10 kW; 10 / 0.8 = 12.5 kVA.
      // gen-15 (Prime 12 kW / 15 kVA; limits 9.6 kW / 12 kVA).
      // 8 kW <= 9.6 kW and 10 kVA <= 12 kVA -> gen-15 PASSES.
      const load: LoadItem[] = [
        {
          id: 'test-small-load',
          name: 'Small Load',
          category: 'Custom',
          quantity: 1,
          unitPower: 8,
          powerUnit: 'kW',
          powerFactor: 0.8,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          demandFactor: 1.0,
        },
      ];

      const result = calculateGeneratorSizing(load, { headroomPercent: 20 });
      expect(result.summary.recommendedGenerator?.id).toBe('gen-15');
      // gen-15 is lowest in catalog, so lower alternative is null
      expect(result.summary.alternativeComparisons.lower).toBeNull();
      expect(result.summary.alternativeComparisons.heavyDuty?.generator.id).toBe('gen-20');
      expect(result.summary.alternativeComparisons.heavyDuty?.qualifies).toBe(true);
      // Continuous limit of gen-20 (16 kW / 20 kVA) at 80%: 12.8 kW / 16.0 kVA
      // Margin to 80% limit: 12.8 - 8 = 4.8 kW; 16.0 - 10 = 6.0 kVA
      expect(result.summary.alternativeComparisons.heavyDuty?.operatingMarginKw).toBe(4.8);
      expect(result.summary.alternativeComparisons.heavyDuty?.operatingMarginKva).toBe(6.0);
    });

    it('Scenario 7: Exact Test 3 Case - Ensures catalog alternatives dynamically update margins from active demand and never retain stale values', () => {
      // Test 3 Scenario:
      // Load configuration: Connected demand = 13.77 kW. When diversity is ON in Office profile -> 10.77 kW.
      // E.g. Load 1: 12.0 kW General (0.75 factor in Office -> 9.0 kW)
      //      Load 2: 1.77 kW Custom (1.00 factor in Office -> 1.77 kW)
      // Total Connected = 13.77 kW / 13.77 kVA (at PF 1.0)
      // Total Diversified = 10.77 kW / 10.77 kVA
      const test3Loads: LoadItem[] = [
        {
          id: 'test3-load-1',
          name: 'General Commercial Loads',
          category: 'General',
          quantity: 1,
          unitPower: 12.0,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
        },
        {
          id: 'test3-load-2',
          name: 'Dedicated Servers',
          category: 'Custom',
          quantity: 1,
          unitPower: 1.77,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          demandFactor: 1.0,
        },
      ];

      // Configuration 1: Demand Diversity ON
      const resultDiversityOn = calculateGeneratorSizing(test3Loads, {
        facilityType: 'Office',
        applyDiversity: true,
        headroomPercent: 20,
      });

      expect(resultDiversityOn.summary.totalDiversifiedKw).toBe(10.77);
      expect(resultDiversityOn.summary.totalDiversifiedKva).toBe(10.77);
      // At 20% headroom, required Prime kW = 10.77 / 0.8 = 13.46 kW.
      // gen-20 has primeKw = 16 kW (80% limit = 12.8 kW) -> QUALIFIED and RECOMMENDED!
      expect(resultDiversityOn.summary.recommendedGenerator?.id).toBe('gen-20');
      expect(resultDiversityOn.summary.operatingMarginKw).toBe(2.03); // 12.8 - 10.77 = +2.03 kW

      // Configuration 2: Demand Diversity OFF (Test 3 Reported Case)
      const resultDiversityOff = calculateGeneratorSizing(test3Loads, {
        facilityType: 'Office',
        applyDiversity: false,
        headroomPercent: 20,
      });

      expect(resultDiversityOff.summary.totalConnectedKw).toBe(13.77);
      expect(resultDiversityOff.summary.totalDiversifiedKw).toBe(13.77);
      expect(resultDiversityOff.summary.totalDiversifiedKva).toBe(13.77);

      // At 20% headroom, required Prime kW = 13.77 / 0.8 = 17.21 kW.
      // 20 kVA generator has Prime = 16 kW, 80% continuous limit = 12.8 kW.
      // Correct margin = 12.8 - 13.77 = -0.97 kW.
      // 20 kVA is disqualified and steps up to 25 kVA (Prime 20 kW, 80% limit 16.0 kW).
      expect(resultDiversityOff.summary.recommendedGenerator?.id).toBe('gen-25');
      expect(resultDiversityOff.summary.operatingMarginKw).toBe(2.23); // 16.0 - 13.77 = +2.23 kW

      // Audit Alternative Cards for Stale Values:
      // The 20 kVA generator is now the 'lower' candidate.
      const lower = resultDiversityOff.summary.alternativeComparisons.lower;
      expect(lower).toBeDefined();
      expect(lower?.generator.id).toBe('gen-20');
      expect(lower?.qualifies).toBe(false);
      expect(lower?.label).toBe('Undersized / Not Recommended');

      // Failure reason correctly reports 0.97 kW deficit
      expect(lower?.failureReason).toContain(
        'Exceeds 80% continuous engine limit by 0.97 kW (Limit: 12.8 kW, Demand: 13.77 kW)'
      );

      // CRITICAL: Operating margin MUST be recalculated from active 13.77 kW demand:
      // Must be -0.97 kW, NEVER retaining stale +2.03 kW from the previous diversified state!
      expect(lower?.operatingMarginKw).toBe(-0.97);
      expect(lower?.operatingMarginKva).toBe(2.23); // 16.0 - 13.77 = 2.23 kVA
      expect(lower?.transientMarginKva).toBeGreaterThan(0);

      // Verify Heavy Duty alternative (30 kVA, Prime 24 kW / 80% limit 19.2 kW)
      const heavyDuty = resultDiversityOff.summary.alternativeComparisons.heavyDuty;
      expect(heavyDuty).toBeDefined();
      expect(heavyDuty?.generator.id).toBe('gen-30');
      expect(heavyDuty?.qualifies).toBe(true);
      expect(heavyDuty?.operatingMarginKw).toBe(5.43); // 19.2 - 13.77
      expect(heavyDuty?.operatingMarginKva).toBe(10.23); // 24.0 - 13.77
    });
  });

  describe('Phase Selection & Equipment Phase Governance (3-Phase vs Single-Phase)', () => {
    describe('3-Phase Permanent Validation & Regression Suite (Cases A through F)', () => {
      it('Case A: 15 HP Star-Delta motor -> recommends 30 kVA generator', () => {
        const loads: LoadItem[] = [
          {
            id: 'case-a',
            name: '15 HP Motor',
            category: 'Motors',
            quantity: 1,
            unitPower: 15,
            powerUnit: 'HP',
            powerFactor: 0.8,
            efficiency: 0.85,
            isMotor: true,
            startingMethod: 'StarDelta',
            confidence: 'Nameplate',
            phase: 'three',
          },
        ];

        const result = calculateGeneratorSizing(loads, {
          electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
        });

        expect(result.summary.recommendedGenerator?.id).toBe('gen-30');
        expect(result.summary.recommendedGenerator?.primeKva).toBe(30);
        expect(result.summary.electricalSystem.phase).toBe('three');
        expect(result.summary.electricalSystem.voltage).toBe(415);
      });

      it('Case B: 15 HP DOL motor -> recommends 62.5 kVA generator', () => {
        const loads: LoadItem[] = [
          {
            id: 'case-b',
            name: '15 HP Motor',
            category: 'Motors',
            quantity: 1,
            unitPower: 15,
            powerUnit: 'HP',
            powerFactor: 0.8,
            efficiency: 0.85,
            isMotor: true,
            startingMethod: 'DOL',
            confidence: 'Nameplate',
            phase: 'three',
          },
        ];

        const result = calculateGeneratorSizing(loads, {
          electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
        });

        expect(result.summary.recommendedGenerator?.id).toBe('gen-62.5');
        expect(result.summary.recommendedGenerator?.primeKva).toBe(62.5);
      });

      it('Case C: 10 kW heater + 10 HP DOL motor -> recommends 40 kVA generator', () => {
        const loads: LoadItem[] = [
          {
            id: 'c-heater',
            name: '10 kW Heater',
            category: 'General',
            quantity: 1,
            unitPower: 10,
            powerUnit: 'kW',
            powerFactor: 1.0,
            isMotor: false,
            startingMethod: 'None',
            confidence: 'Nameplate',
            phase: 'any',
          },
          {
            id: 'c-motor',
            name: '10 HP DOL Motor',
            category: 'Motors',
            quantity: 1,
            unitPower: 10,
            powerUnit: 'HP',
            powerFactor: 0.8,
            efficiency: 0.85,
            isMotor: true,
            startingMethod: 'DOL',
            confidence: 'Nameplate',
            phase: 'three',
          },
        ];

        const result = calculateGeneratorSizing(loads, {
          facilityType: 'Office',
          applyDiversity: true,
          electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
        });

        expect(result.summary.recommendedGenerator?.id).toBe('gen-40');
        expect(result.summary.recommendedGenerator?.primeKva).toBe(40);
      });

      it('Case D: 2 × 5 HP DOL motors (Simultaneous ATS block start) -> recommends 40 kVA generator', () => {
        const loads: LoadItem[] = [
          {
            id: 'd-motor',
            name: '5 HP DOL Motor',
            category: 'Motors',
            quantity: 2,
            unitPower: 5,
            powerUnit: 'HP',
            powerFactor: 0.8,
            efficiency: 0.85,
            isMotor: true,
            startingMethod: 'DOL',
            confidence: 'Nameplate',
            phase: 'three',
          },
        ];

        const result = calculateGeneratorSizing(loads, {
          motorStartingSequence: 'Simultaneous',
          electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
        });

        expect(result.summary.recommendedGenerator?.id).toBe('gen-40');
        expect(result.summary.recommendedGenerator?.primeKva).toBe(40);
      });

      it('Case E: 10 kW heater + 5 HP DOL + 7.5 HP Star-Delta (No Diversity) -> recommends 40 kVA generator', () => {
        const loads: LoadItem[] = [
          {
            id: 'e-heater',
            name: '10 kW Heater',
            category: 'General',
            quantity: 1,
            unitPower: 10,
            powerUnit: 'kW',
            powerFactor: 1.0,
            isMotor: false,
            startingMethod: 'None',
            confidence: 'Nameplate',
            phase: 'any',
          },
          {
            id: 'e-dol',
            name: '5 HP DOL Motor',
            category: 'Motors',
            quantity: 1,
            unitPower: 5,
            powerUnit: 'HP',
            powerFactor: 0.8,
            efficiency: 0.85,
            isMotor: true,
            startingMethod: 'DOL',
            confidence: 'Nameplate',
            phase: 'three',
          },
          {
            id: 'e-sd',
            name: '7.5 HP Star-Delta Motor',
            category: 'Motors',
            quantity: 1,
            unitPower: 7.5,
            powerUnit: 'HP',
            powerFactor: 0.8,
            efficiency: 0.85,
            isMotor: true,
            startingMethod: 'StarDelta',
            confidence: 'Nameplate',
            phase: 'three',
          },
        ];

        const result = calculateGeneratorSizing(loads, {
          applyDiversity: false,
          electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
        });

        expect(result.summary.recommendedGenerator?.id).toBe('gen-40');
        expect(result.summary.recommendedGenerator?.primeKva).toBe(40);
      });

      it('Case F: 3 × 5 HP DOL motors (Sequential start) -> recommends 25 kVA generator', () => {
        const loads: LoadItem[] = [
          {
            id: 'f-motor',
            name: '5 HP DOL Motor',
            category: 'Motors',
            quantity: 3,
            unitPower: 5,
            powerUnit: 'HP',
            powerFactor: 0.8,
            efficiency: 0.85,
            isMotor: true,
            startingMethod: 'DOL',
            confidence: 'Nameplate',
            phase: 'three',
          },
        ];

        const result = calculateGeneratorSizing(loads, {
          motorStartingSequence: 'Sequential',
          electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
        });

        expect(result.summary.recommendedGenerator?.id).toBe('gen-25');
        expect(result.summary.recommendedGenerator?.primeKva).toBe(25);
      });
    });

    describe('Phase Compatibility Status Hierarchy (Compatible / Requires Verification / Incompatible)', () => {
      it('Unknown-Phase Motor: calculates theoretical load, flags Requires Verification, and docks confidence', () => {
        const load: LoadItem[] = [
          {
            id: 'unknown-pump',
            name: '5 HP Groundwater Pump',
            category: 'Motors',
            quantity: 1,
            unitPower: 5,
            powerUnit: 'HP',
            powerFactor: 0.8,
            isMotor: true,
            startingMethod: 'DOL',
            confidence: 'Nameplate',
            phase: 'unknown', // Unknown phase!
          },
        ];

        const result = calculateGeneratorSizing(load, {
          electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
        });

        // 1. Theoretical load is physically calculated into demand (not silently dropped)
        expect(result.summary.totalConnectedKw).toBeCloseTo(4.39, 1);
        expect(result.summary.totalDiversifiedKva).toBeGreaterThan(0);

        // 2. Load status is 'Requires Verification'
        expect(result.breakdown[0].phaseStatus).toBe('Requires Verification');
        expect(result.breakdown[0].phaseStatusReason).toContain('Requires Phase Verification');

        // 3. Phase audit tracks the item
        expect(result.summary.phaseAudit.hasUnknownPhaseLoads).toBe(true);
        expect(result.summary.phaseAudit.requiresVerificationCount).toBe(1);

        // 4. Stated assumptions & warnings reflect unconfirmed phase
        expect(
          result.summary.statedAssumptions.some((a) => a.includes('unverified phase configurations'))
        ).toBe(true);
        expect(
          result.summary.warnings.some((w) => w.includes('PHASE VERIFICATION REQUIRED'))
        ).toBe(true);
      });

      it('3-Phase Motor on 230 V Single-Phase: flags Incompatible with Single-Phase', () => {
        const load: LoadItem[] = [
          {
            id: '3p-motor',
            name: '5 HP Industrial Blower',
            category: 'Motors',
            quantity: 1,
            unitPower: 5,
            powerUnit: 'HP',
            powerFactor: 0.8,
            isMotor: true,
            startingMethod: 'DOL',
            confidence: 'Nameplate',
            phase: 'three', // 3-phase motor!
          },
        ];

        const result = calculateGeneratorSizing(load, {
          electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
        });

        // Flagged Incompatible with explanation
        expect(result.breakdown[0].phaseStatus).toBe('Incompatible');
        expect(result.breakdown[0].phaseStatusReason).toContain('Incompatible with Single-Phase');
        expect(result.breakdown[0].phaseStatusReason).toContain('3-phase motor cannot operate on a 230V single-phase supply');

        // Audit reflects incompatibility
        expect(result.summary.phaseAudit.hasIncompatibleLoads).toBe(true);
        expect(result.summary.phaseAudit.incompatibleCount).toBe(1);
        expect(result.summary.confidence).toBe('Low');
        expect(
          result.summary.warnings.some((w) => w.includes('ELECTRICAL INCOMPATIBILITY'))
        ).toBe(true);
      });

      it('Star-Delta Motor on Single-Phase: flags Incompatible with Single-Phase', () => {
        const load: LoadItem[] = [
          {
            id: 'sd-motor',
            name: '10 HP Chiller Compressor',
            category: 'Motors',
            quantity: 1,
            unitPower: 10,
            powerUnit: 'HP',
            powerFactor: 0.8,
            isMotor: true,
            startingMethod: 'StarDelta', // Physically impossible on 1-Phase
            confidence: 'Nameplate',
          },
        ];

        const result = calculateGeneratorSizing(load, {
          electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
        });

        expect(result.breakdown[0].phaseStatus).toBe('Incompatible');
        expect(result.breakdown[0].phaseStatusReason).toContain('Star-Delta starting method requires a 3-phase supply');
        expect(result.summary.phaseAudit.hasIncompatibleLoads).toBe(true);
      });

      it('Confirmed Single-Phase equipment on Single-Phase system: flags Compatible', () => {
        const load: LoadItem[] = [
          {
            id: 'split-ac',
            name: '1.5 Ton Split AC',
            category: 'HVAC',
            quantity: 2,
            unitPower: 1.5,
            powerUnit: 'kW',
            powerFactor: 0.85,
            isMotor: true,
            startingMethod: 'Inverter',
            confidence: 'Nameplate',
            phase: 'single',
          },
          {
            id: 'lights',
            name: 'LED Battens',
            category: 'Lighting',
            quantity: 10,
            unitPower: 20,
            powerUnit: 'W',
            powerFactor: 0.95,
            isMotor: false,
            startingMethod: 'None',
            confidence: 'Nameplate',
            phase: 'any',
          },
        ];

        const result = calculateGeneratorSizing(load, {
          electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
        });

        expect(result.breakdown[0].phaseStatus).toBe('Compatible');
        expect(result.breakdown[1].phaseStatus).toBe('Compatible');
        expect(result.summary.phaseAudit.compatibleCount).toBe(12);
        expect(result.summary.phaseAudit.incompatibleCount).toBe(0);
        expect(result.summary.phaseAudit.requiresVerificationCount).toBe(0);
      });
    });

    describe('Provisional Single-Phase Catalog Isolation & Sizing', () => {
      it('verifies catalog quarantine: production 3-phase models vs provisional single-phase models', () => {
        expect(PRODUCTION_THREE_PHASE_CATALOG.length).toBe(16);
        expect(
          PRODUCTION_THREE_PHASE_CATALOG.every(
            (g) => g.catalogStatus === 'production_verified' && g.supportedPhases.includes('three')
          )
        ).toBe(true);

        expect(PROVISIONAL_SINGLE_PHASE_CATALOG.length).toBe(5);
        expect(
          PROVISIONAL_SINGLE_PHASE_CATALOG.every(
            (g) => g.catalogStatus === 'provisional_reference' && g.isProvisional === true && g.supportedPhases.includes('single')
          )
        ).toBe(true);
      });

      it('sizes purely resistive single-phase load from provisional single-phase catalog', () => {
        // 3 kW resistive load on 230V Single-Phase
        // S = 3 kVA, I = 3000 / 230 = 13.0 A
        // At 20% headroom: required Prime = 3 / 0.8 = 3.75 kVA / 3.75 kW
        // DG-5 kVA 1Φ has Prime 5 kVA / 4 kW, transient 9.5 kVA -> QUALIFIES!
        const load: LoadItem[] = [
          {
            id: 'resistive-1',
            name: '3 kW Baseboard Heating',
            category: 'General',
            quantity: 1,
            unitPower: 3,
            powerUnit: 'kW',
            powerFactor: 1.0,
            isMotor: false,
            startingMethod: 'None',
            confidence: 'Nameplate',
            phase: 'single',
            demandFactor: 1.0,
          },
        ];

        const result = calculateGeneratorSizing(load, {
          applyDiversity: false,
          electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
        });

        expect(result.summary.recommendedGenerator?.id).toBe('gen-1p-5');
        expect(result.summary.recommendedGenerator?.primeKva).toBe(5);
        expect(result.summary.recommendedGenerator?.isProvisional).toBe(true);
        expect(result.summary.totalDiversifiedAmps).toBeCloseTo(13.0, 1);
        expect(
          result.summary.statedAssumptions.some((a) => a.includes('Single-Phase 230V'))
        ).toBe(true);
        expect(
          result.summary.statedAssumptions.some((a) => a.includes('Provisional Reference Data'))
        ).toBe(true);
      });

      it('sizes single-phase motor with starting inrush surge', () => {
        // 2 HP single-phase motor
        // Input kW = 2 * 0.7457 / 0.85 = 1.755 kW. Running kVA = 1.755 / 0.8 = 2.193 kVA.
        // DOL multiplier = 6.0x -> Starting kVA = 2.193 * 6 = 13.16 kVA.
        // DG-5 kVA has transientCapacityKva: 9.5 (< 13.16) -> FAILS transient surge!
        // DG-7.5 kVA has transientCapacityKva: 14.0 (>= 13.16) -> QUALIFIES & RECOMMENDED!
        const load: LoadItem[] = [
          {
            id: 'sp-motor',
            name: '2 HP Sump Pump',
            category: 'Motors',
            quantity: 1,
            unitPower: 2,
            powerUnit: 'HP',
            powerFactor: 0.8,
            efficiency: 0.85,
            isMotor: true,
            startingMethod: 'DOL',
            confidence: 'Nameplate',
            phase: 'single',
            demandFactor: 1.0,
          },
        ];

        const result = calculateGeneratorSizing(load, {
          applyDiversity: false,
          electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
        });

        expect(result.summary.recommendedGenerator?.id).toBe('gen-1p-7.5');
        expect(result.summary.recommendedGenerator?.primeKva).toBe(7.5);
        expect(result.summary.peakTransientKva).toBeCloseTo(13.16, 1);
      });

      it('exceeding 15 kVA single-phase ceiling clearly warns no compatible generator exists', () => {
        // 25 kW load on Single-Phase
        const heavyLoad: LoadItem[] = [
          {
            id: 'heavy-load',
            name: 'Commercial Kitchen Induction Range',
            category: 'Appliances',
            quantity: 1,
            unitPower: 25,
            powerUnit: 'kW',
            powerFactor: 0.95,
            isMotor: false,
            startingMethod: 'None',
            confidence: 'Nameplate',
            phase: 'single',
            demandFactor: 1.0,
          },
        ];

        const result = calculateGeneratorSizing(heavyLoad, {
          applyDiversity: false,
          electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
        });

        // No single-phase DG exceeds 15 kVA
        expect(result.summary.recommendedGenerator).toBeNull();
        expect(
          result.summary.statedAssumptions.some((a) =>
            a.includes('Single-Phase Capacity Ceiling')
          )
        ).toBe(true);
      });
    });

    describe('Electrical Math: Single-Phase vs 3-Phase Line Currents', () => {
      it('calculates current accurately for 1-phase vs 3-phase', () => {
        // Single-phase: I = (10 kVA * 1000) / 230 V = 43.48 A
        expect(calculateCurrentAmps(10, 230, 'single')).toBe(43.5);

        // Three-phase: I = (10 kVA * 1000) / (sqrt(3) * 415 V) = 13.91 A
        expect(calculateCurrentAmps(10, 415, 'three')).toBe(13.9);

        // Inverse calculation: currentToKva
        expect(currentToKva(43.5, 230, 'single')).toBeCloseTo(10, 0);
        expect(currentToKva(13.9, 415, 'three')).toBeCloseTo(10, 0);
      });

      it('switching between 3-phase and single-phase updates currents and recommendations dynamically', () => {
        const mixedLoad: LoadItem[] = [
          {
            id: 'lights',
            name: 'Office Lighting',
            category: 'Lighting',
            quantity: 50,
            unitPower: 40,
            powerUnit: 'W',
            powerFactor: 0.95,
            isMotor: false,
            startingMethod: 'None',
            confidence: 'Nameplate',
            phase: 'any',
          },
          {
            id: 'ac',
            name: 'Split ACs',
            category: 'HVAC',
            quantity: 2,
            unitPower: 1.5,
            powerUnit: 'kW',
            powerFactor: 0.85,
            isMotor: true,
            startingMethod: 'Inverter',
            confidence: 'Nameplate',
            phase: 'single',
          },
        ];

        // 1. Evaluate on 3-Phase 415V
        const result3P = calculateGeneratorSizing(mixedLoad, {
          electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
        });
        expect(result3P.summary.recommendedGenerator?.phase).toBe(3);
        expect(result3P.summary.recommendedGenerator?.supportedPhases).toContain('three');

        // 2. Evaluate on Single-Phase 230V
        const result1P = calculateGeneratorSizing(mixedLoad, {
          electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
        });
        expect(result1P.summary.recommendedGenerator?.phase).toBe(1);
        expect(result1P.summary.recommendedGenerator?.supportedPhases).toContain('single');

        // Single-phase line current is higher than 3-phase line current for same kVA
        expect(result1P.summary.totalConnectedAmps).toBeGreaterThan(
          result3P.summary.totalConnectedAmps
        );
      });
    });
  });
});

