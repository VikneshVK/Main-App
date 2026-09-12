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
      name: `${kva} kVA Resistive Test Load`,
      category: 'Custom',
      quantity: 1,
      unitPower: kva,
      powerUnit: 'kVA',
      powerFactor: 1.0,
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
});
