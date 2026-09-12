import { describe, it, expect } from 'vitest';
import {
  calculateGeneratorSizing,
  normalizeToKw,
  kwToKva,
  vectorPowerSum,
  calculateStartingKva,
  LoadItem,
  GeneratorModel,
  CURRENT_ENGINE_VERSION,
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
    });
  });
});
