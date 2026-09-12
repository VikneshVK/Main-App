import { describe, it, expect } from 'vitest';
import {
  calculateGeneratorSizing,
  calculateCurrentAmps,
  currentToKva,
  LoadItem,
  ElectricalSystem,
  PRODUCTION_THREE_PHASE_CATALOG,
  PROVISIONAL_SINGLE_PHASE_CATALOG,
  STANDARD_GENERATOR_CATALOG,
  matchGenerators,
} from '../index';

describe('Phase Selection & Equipment Phase Governance — Formal Test Specification', () => {
  // ==================================================
  // 1. ELECTRICAL SYSTEM DEFAULT
  // ==================================================
  describe('1. ELECTRICAL SYSTEM DEFAULT', () => {
    it('TEST E1 — Default electrical system with no equipment added', () => {
      const result = calculateGeneratorSizing([]);

      // Expected defaults
      expect(result.summary.electricalSystem.phase).toBe('three');
      expect(result.summary.electricalSystem.voltage).toBe(415);
      expect(result.summary.electricalSystem.frequency).toBe(50);

      // Equipment Phase Audit empty
      expect(result.summary.phaseAudit.compatibleCount).toBe(0);
      expect(result.summary.phaseAudit.requiresVerificationCount).toBe(0);
      expect(result.summary.phaseAudit.incompatibleCount).toBe(0);
      expect(result.summary.phaseAudit.hasUnknownPhaseLoads).toBe(false);
      expect(result.summary.phaseAudit.hasIncompatibleLoads).toBe(false);

      // Electrical telemetry
      expect(result.summary.totalConnectedAmps).toBe(0);
      expect(result.summary.totalDiversifiedAmps).toBe(0);
      expect(result.summary.totalConnectedKw).toBe(0);
      expect(result.summary.totalDiversifiedKva).toBe(0);
      expect(result.summary.peakTransientKva).toBe(0);
      expect(result.summary.recommendedGenerator).toBeNull();
    });
  });

  // ==================================================
  // 2. SINGLE-PHASE SYSTEM SWITCHING
  // ==================================================
  describe('2. SINGLE-PHASE SYSTEM SWITCHING', () => {
    it('TEST E2 — Switch from 3-phase to single-phase with no loads', () => {
      const singlePhaseSys: ElectricalSystem = {
        phase: 'single',
        voltage: 230,
        frequency: 50,
      };
      const result = calculateGeneratorSizing([], {
        electricalSystem: singlePhaseSys,
      });

      expect(result.summary.electricalSystem.phase).toBe('single');
      expect(result.summary.electricalSystem.voltage).toBe(230);
      expect(result.summary.electricalSystem.frequency).toBe(50);
      expect(result.summary.totalConnectedAmps).toBe(0);
      expect(result.summary.phaseAudit.hasIncompatibleLoads).toBe(false);
    });

    it('TEST E3 — Switch back to 3-phase preserves calculation state and loads', () => {
      const load: LoadItem[] = [
        {
          id: 'load-1',
          name: 'Office Computer',
          category: 'Office',
          quantity: 2,
          unitPower: 250,
          powerUnit: 'W',
          powerFactor: 0.9,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          phase: 'any',
        },
      ];

      // 1. Initial 3-Phase
      const res3P_1 = calculateGeneratorSizing(load, {
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });
      expect(res3P_1.summary.electricalSystem.phase).toBe('three');
      expect(res3P_1.summary.electricalSystem.voltage).toBe(415);
      expect(res3P_1.breakdown.length).toBe(1);

      // 2. Switch to Single-Phase
      const res1P = calculateGeneratorSizing(load, {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(res1P.summary.electricalSystem.phase).toBe('single');
      expect(res1P.summary.electricalSystem.voltage).toBe(230);
      expect(res1P.breakdown.length).toBe(1);

      // 3. Switch back to 3-Phase
      const res3P_2 = calculateGeneratorSizing(load, {
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });
      expect(res3P_2.summary.electricalSystem.phase).toBe('three');
      expect(res3P_2.summary.electricalSystem.voltage).toBe(415);
      expect(res3P_2.breakdown.length).toBe(1);
      expect(res3P_2.summary.totalConnectedKw).toBe(res3P_1.summary.totalConnectedKw);
      expect(res3P_2.summary.totalConnectedAmps).toBe(res3P_1.summary.totalConnectedAmps);
    });
  });

  // ==================================================
  // 3. CURRENT CALCULATION TESTS
  // ==================================================
  describe('3. CURRENT CALCULATION TESTS', () => {
    it('TEST C1 — Single-phase resistive load: I = (kVA * 1000) / V = 3000 / 230 = 13.04 A', () => {
      const heater: LoadItem[] = [
        {
          id: 'test-heater',
          name: 'Test Heater',
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

      const result = calculateGeneratorSizing(heater, {
        applyDiversity: false,
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      expect(result.summary.totalConnectedKw).toBe(3.0);
      expect(result.summary.totalConnectedKva).toBe(3.0);
      // Math formula check: 3000 / 230 = 13.043 A
      const expectedAmps = 3000 / 230;
      expect(result.summary.totalConnectedAmps).toBeCloseTo(expectedAmps, 1);
      expect(result.breakdown[0].currentAmps).toBeCloseTo(expectedAmps, 1);
      expect(result.breakdown[0].phaseStatus).toBe('Compatible');

      // Inverse current to kVA verification
      expect(currentToKva(expectedAmps, 230, 'single')).toBeCloseTo(3.0, 1);
    });

    it('TEST C2 — Three-phase equivalent current: I = (kVA * 1000) / (sqrt(3) * 415) = 4.17 A', () => {
      const heater: LoadItem[] = [
        {
          id: 'test-heater-3p',
          name: '3-Phase Test Heater',
          category: 'General',
          quantity: 1,
          unitPower: 3,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          phase: 'three',
          demandFactor: 1.0,
        },
      ];

      const result = calculateGeneratorSizing(heater, {
        applyDiversity: false,
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });

      // Verification of sqrt(3) standard: 3000 / (sqrt(3) * 415) = 4.1738 A
      const expectedAmps = 3000 / (Math.sqrt(3) * 415);
      expect(result.summary.totalConnectedAmps).toBeCloseTo(expectedAmps, 1);
      expect(result.breakdown[0].currentAmps).toBeCloseTo(expectedAmps, 1);
      expect(result.breakdown[0].phaseStatus).toBe('Compatible');

      // Inverse current to kVA verification
      expect(currentToKva(expectedAmps, 415, 'three')).toBeCloseTo(3.0, 1);

      // Explicitly verify sqrt(3) is used, NOT 3:
      const wrongThreePhaseAmps = 3000 / (3 * 415); // ~ 2.41 A
      expect(result.summary.totalConnectedAmps).not.toBeCloseTo(wrongThreePhaseAmps, 1);
      expect(calculateCurrentAmps(3, 415, 'three')).toBeCloseTo(4.2, 1);
    });
  });

  // ==================================================
  // 4. PURE SINGLE-PHASE GENERATOR TEST
  // ==================================================
  describe('4. PURE SINGLE-PHASE GENERATOR TEST', () => {
    it('TEST G1 — 3 kW single-phase load matches provisional single-phase unit only', () => {
      const load: LoadItem[] = [
        {
          id: 'sp-load',
          name: 'Single Phase Resistive Load',
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

      // Running demand
      expect(result.summary.totalDiversifiedKva).toBe(3.0);
      expect(result.summary.totalDiversifiedAmps).toBeCloseTo(13.0, 1);

      // Only single-phase generators are candidates
      expect(result.summary.recommendedGenerator).not.toBeNull();
      expect(result.summary.recommendedGenerator?.phase).toBe(1);
      expect(result.summary.recommendedGenerator?.supportedPhases).toContain('single');
      expect(result.summary.recommendedGenerator?.supportedPhases).not.toContain('three');

      // Must be smallest qualifying single-phase provisional unit: DG-5 kVA 1Φ
      expect(result.summary.recommendedGenerator?.id).toBe('gen-1p-5');
      expect(result.summary.recommendedGenerator?.isProvisional).toBe(true);

      // Recommendation clearly identifies catalog data as provisional
      expect(
        result.summary.statedAssumptions.some((a) =>
          a.includes('Provisional Reference Data')
        )
      ).toBe(true);
    });
  });

  // ==================================================
  // 5. SINGLE-PHASE MOTOR TEST
  // ==================================================
  describe('5. SINGLE-PHASE MOTOR TEST', () => {
    it('TEST M1 — Single-phase 2 HP motor evaluates continuous & transient limits', () => {
      const motor: LoadItem[] = [
        {
          id: 'test-motor-2hp',
          name: 'Test Motor',
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

      const result = calculateGeneratorSizing(motor, {
        applyDiversity: false,
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      // Motor is NOT marked incompatible
      expect(result.breakdown[0].phaseStatus).toBe('Compatible');

      // Starting surge is calculated
      expect(result.summary.peakTransientKva).toBeGreaterThan(0);
      expect(result.summary.peakTransientKva).toBeCloseTo(13.16, 1);

      // Running current uses single-phase formula
      // Input kW = 2 * 0.7457 / 0.85 = 1.7546 kW. kVA = 1.7546 / 0.8 = 2.193 kVA
      // Current = 2193 / 230 = 9.53 A
      expect(result.summary.totalConnectedAmps).toBeCloseTo(9.5, 1);

      // Sizing matches 7.5 kVA (gen-1p-7.5) because 5 kVA has only 9.5 SKVA < 13.16 SKVA
      expect(result.summary.recommendedGenerator?.id).toBe('gen-1p-7.5');
      expect(result.summary.recommendedGenerator?.phase).toBe(1);
    });
  });

  // ==================================================
  // 6. THREE-PHASE MOTOR ON THREE-PHASE SYSTEM
  // ==================================================
  describe('6. THREE-PHASE MOTOR ON THREE-PHASE SYSTEM', () => {
    it('TEST P1 — Normal compatible 3-phase motor', () => {
      const motor: LoadItem[] = [
        {
          id: 'motor-5hp-3p',
          name: '5 HP Blower',
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
          demandFactor: 1.0,
        },
      ];

      const result = calculateGeneratorSizing(motor, {
        applyDiversity: false,
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });

      expect(result.breakdown[0].phaseStatus).toBe('Compatible');
      expect(result.summary.phaseAudit.incompatibleCount).toBe(0);
      expect(result.summary.phaseAudit.requiresVerificationCount).toBe(0);

      // Three-phase current formula
      // Input kW = 5 * 0.7457 / 0.85 = 4.386 kW. kVA = 5.483 kVA
      // I = 5483 / (sqrt(3) * 415) = 7.63 A
      expect(result.summary.totalConnectedAmps).toBeCloseTo(7.6, 1);
      expect(result.summary.recommendedGenerator).not.toBeNull();
      expect(result.summary.recommendedGenerator?.phase).toBe(3);
    });
  });

  // ==================================================
  // 7. SINGLE-PHASE MOTOR ON THREE-PHASE SYSTEM
  // ==================================================
  describe('7. SINGLE-PHASE MOTOR ON THREE-PHASE SYSTEM', () => {
    it('TEST P2 — Single-phase motor connected to 3-phase supply is preserved and compatible', () => {
      const motor: LoadItem[] = [
        {
          id: 'motor-5hp-1p',
          name: '5 HP Single-Phase Motor',
          category: 'Motors',
          quantity: 1,
          unitPower: 5,
          powerUnit: 'HP',
          powerFactor: 0.8,
          efficiency: 0.85,
          isMotor: true,
          startingMethod: 'DOL',
          confidence: 'Nameplate',
          phase: 'single', // Explicit single-phase
          demandFactor: 1.0,
        },
      ];

      const result = calculateGeneratorSizing(motor, {
        applyDiversity: false,
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });

      // Does NOT silently convert equipment to 3-phase
      expect(result.breakdown[0].item.phase).toBe('single');
      // System distributes single-phase across 3-phase facility: Compatible
      expect(result.breakdown[0].phaseStatus).toBe('Compatible');
      expect(result.summary.phaseAudit.incompatibleCount).toBe(0);
    });
  });

  // ==================================================
  // 8. THREE-PHASE MOTOR ON SINGLE-PHASE SYSTEM
  // ==================================================
  describe('8. THREE-PHASE MOTOR ON SINGLE-PHASE SYSTEM', () => {
    it('TEST P3 — Hard incompatibility: 3-phase motor on Single-Phase 230V', () => {
      const motor: LoadItem[] = [
        {
          id: 'motor-5hp-3p-on-1p',
          name: '5 HP 3-Phase Pump',
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
          demandFactor: 1.0,
        },
      ];

      const result = calculateGeneratorSizing(motor, {
        applyDiversity: false,
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      expect(result.breakdown[0].phaseStatus).toBe('Incompatible');
      expect(result.breakdown[0].phaseStatusReason).toBe(
        'Incompatible with Single-Phase: 3-phase motor cannot operate on a 230 V single-phase supply.'
      );
      expect(result.summary.phaseAudit.incompatibleCount).toBe(1);
      expect(result.summary.phaseAudit.hasIncompatibleLoads).toBe(true);
      expect(result.summary.confidence).toBe('Low');
      expect(
        result.summary.warnings.some((w) => w.includes('ELECTRICAL INCOMPATIBILITY'))
      ).toBe(true);
    });
  });

  // ==================================================
  // 9. STAR-DELTA ON SINGLE-PHASE
  // ==================================================
  describe('9. STAR-DELTA ON SINGLE-PHASE', () => {
    it('TEST P4 — Star-Delta starter on single-phase is flagged as incompatible', () => {
      const motor: LoadItem[] = [
        {
          id: 'sd-motor-on-1p',
          name: '5 HP Motor with Star-Delta',
          category: 'Motors',
          quantity: 1,
          unitPower: 5,
          powerUnit: 'HP',
          powerFactor: 0.8,
          isMotor: true,
          startingMethod: 'StarDelta',
          confidence: 'Nameplate',
        },
      ];

      const result = calculateGeneratorSizing(motor, {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      expect(result.breakdown[0].phaseStatus).toBe('Incompatible');
      expect(result.breakdown[0].phaseStatusReason).toContain(
        'Incompatible with Single-Phase: Star-Delta starter requires a 3-phase supply'
      );
      expect(result.summary.phaseAudit.incompatibleCount).toBe(1);
    });
  });

  // ==================================================
  // 10. UNKNOWN PHASE GOVERNANCE
  // ==================================================
  describe('10. UNKNOWN PHASE GOVERNANCE', () => {
    it('TEST V1 — Unknown phase equipment flags Requires Verification', () => {
      const motor: LoadItem[] = [
        {
          id: 'unknown-phase-motor',
          name: 'Water Motor',
          category: 'Motors',
          quantity: 1,
          unitPower: 5,
          powerUnit: 'HP',
          powerFactor: 0.8,
          isMotor: true,
          startingMethod: 'DOL',
          confidence: 'Estimated',
          phase: 'unknown',
        },
      ];

      const result = calculateGeneratorSizing(motor, {
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });

      expect(result.breakdown[0].phaseStatus).toBe('Requires Verification');
      expect(result.breakdown[0].phaseStatusReason).toBe(
        'Requires Phase Verification: Equipment phase is unconfirmed. Verify single-phase vs 3-phase nameplate before final quotation.'
      );
      expect(result.summary.phaseAudit.requiresVerificationCount).toBe(1);
      expect(result.summary.phaseAudit.compatibleCount).toBe(0);
      expect(result.summary.phaseAudit.incompatibleCount).toBe(0);
      expect(result.summary.confidenceScore).toBeLessThan(100);
      expect(['Medium', 'Low']).toContain(result.summary.confidence);
      expect(
        result.summary.warnings.some((w) => w.includes('PHASE VERIFICATION REQUIRED'))
      ).toBe(true);
    });
  });

  // ==================================================
  // 11. UNKNOWN PHASE + NAMEPLATE DATA
  // ==================================================
  describe('11. UNKNOWN PHASE + NAMEPLATE DATA', () => {
    it('TEST V2 — Unknown phase despite nameplate confidence remains Requires Verification', () => {
      const motor: LoadItem[] = [
        {
          id: 'nameplate-unknown-phase',
          name: 'Motor with Known kW but Unknown Phase',
          category: 'Motors',
          quantity: 1,
          unitPower: 5,
          powerUnit: 'HP',
          powerFactor: 0.8,
          isMotor: true,
          startingMethod: 'DOL',
          confidence: 'Nameplate', // Confirmed power rating, but...
          phase: 'unknown',        // Phase configuration unconfirmed
        },
      ];

      const result = calculateGeneratorSizing(motor, {
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });

      // Data confidence and phase governance are independent concepts
      expect(result.breakdown[0].phaseStatus).toBe('Requires Verification');
      expect(result.summary.phaseAudit.requiresVerificationCount).toBe(1);
    });
  });

  // ==================================================
  // 12. UNIVERSAL EQUIPMENT
  // ==================================================
  describe('12. UNIVERSAL EQUIPMENT', () => {
    it('TEST U1 — Universal load is compatible on both Single-Phase and 3-Phase', () => {
      const universalItem: LoadItem[] = [
        {
          id: 'universal-load',
          name: '1 kW Universal Appliance',
          category: 'Appliances',
          quantity: 1,
          unitPower: 1,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          phase: 'any',
          demandFactor: 1.0,
        },
      ];

      // On Single-Phase 230V:
      const res1P = calculateGeneratorSizing(universalItem, {
        applyDiversity: false,
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(res1P.breakdown[0].phaseStatus).toBe('Compatible');
      // I = 1000 / 230 = 4.3478 A ≈ 4.35 A
      expect(res1P.summary.totalConnectedAmps).toBeCloseTo(4.35, 1);

      // On 3-Phase 415V:
      const res3P = calculateGeneratorSizing(universalItem, {
        applyDiversity: false,
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });
      expect(res3P.breakdown[0].phaseStatus).toBe('Compatible');
      // I = 1000 / (sqrt(3) * 415) = 1.391 A ≈ 1.39 A
      expect(res3P.summary.totalConnectedAmps).toBeCloseTo(1.39, 1);
    });
  });

  // ==================================================
  // 13. MIXED LOAD — SINGLE-PHASE SYSTEM
  // ==================================================
  describe('13. MIXED LOAD — SINGLE-PHASE SYSTEM', () => {
    it('TEST MX1 — Mixed load correctly segregates Compatible, Incompatible, and Requires Verification', () => {
      const loads: LoadItem[] = [
        {
          id: 'load-a',
          name: '3 kW Heater',
          category: 'General',
          quantity: 1,
          unitPower: 3,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          phase: 'single',
        },
        {
          id: 'load-b',
          name: '5 HP 3-Phase Motor',
          category: 'Motors',
          quantity: 1,
          unitPower: 5,
          powerUnit: 'HP',
          powerFactor: 0.8,
          isMotor: true,
          startingMethod: 'DOL',
          confidence: 'Nameplate',
          phase: 'three',
        },
        {
          id: 'load-c',
          name: '5 HP Water Motor',
          category: 'Motors',
          quantity: 1,
          unitPower: 5,
          powerUnit: 'HP',
          powerFactor: 0.8,
          isMotor: true,
          startingMethod: 'DOL',
          confidence: 'Estimated',
          phase: 'unknown',
        },
      ];

      const result = calculateGeneratorSizing(loads, {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      expect(result.summary.phaseAudit.compatibleCount).toBe(1);
      expect(result.summary.phaseAudit.incompatibleCount).toBe(1);
      expect(result.summary.phaseAudit.requiresVerificationCount).toBe(1);

      expect(result.breakdown[0].phaseStatus).toBe('Compatible');
      expect(result.breakdown[1].phaseStatus).toBe('Incompatible');
      expect(result.breakdown[2].phaseStatus).toBe('Requires Verification');
    });
  });

  // ==================================================
  // 14. PHASE SWITCH WITH EXISTING LOADS
  // ==================================================
  describe('14. PHASE SWITCH WITH EXISTING LOADS', () => {
    it('TEST SW1 — Switching phase updates status dynamically (3P -> 1P -> 3P)', () => {
      const load: LoadItem[] = [
        {
          id: 'motor-5hp',
          name: '5 HP 3-Phase Motor',
          category: 'Motors',
          quantity: 1,
          unitPower: 5,
          powerUnit: 'HP',
          powerFactor: 0.8,
          isMotor: true,
          startingMethod: 'DOL',
          confidence: 'Nameplate',
          phase: 'three',
        },
      ];

      // 1. Start 3-Phase
      const res3P_1 = calculateGeneratorSizing(load, {
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });
      expect(res3P_1.breakdown[0].phaseStatus).toBe('Compatible');
      expect(res3P_1.summary.phaseAudit.incompatibleCount).toBe(0);
      expect(res3P_1.summary.recommendedGenerator?.phase).toBe(3);

      // 2. Switch to Single-Phase
      const res1P = calculateGeneratorSizing(load, {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(res1P.breakdown[0].phaseStatus).toBe('Incompatible');
      expect(res1P.summary.phaseAudit.incompatibleCount).toBe(1);

      // 3. Switch back to 3-Phase
      const res3P_2 = calculateGeneratorSizing(load, {
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });
      expect(res3P_2.breakdown[0].phaseStatus).toBe('Compatible');
      expect(res3P_2.summary.phaseAudit.incompatibleCount).toBe(0);
      expect(res3P_2.summary.recommendedGenerator?.phase).toBe(3);
    });
  });

  // ==================================================
  // 15. CATALOG FILTERING
  // ==================================================
  describe('15. CATALOG FILTERING', () => {
    it('TEST CAT1 — Single-Phase catalog returns ONLY single-phase candidates', () => {
      const match = matchGenerators(
        4,
        3.2,
        8,
        3,
        2.4,
        STANDARD_GENERATOR_CATALOG,
        'single'
      );
      expect(match.recommended).not.toBeNull();
      expect(match.recommended?.supportedPhases).toContain('single');
      expect(match.recommended?.supportedPhases).not.toContain('three');

      if (match.minimumAcceptable) {
        expect(match.minimumAcceptable.supportedPhases).toContain('single');
      }
      if (match.heavyDuty) {
        expect(match.heavyDuty.supportedPhases).toContain('single');
      }
    });

    it('TEST CAT2 — 3-Phase catalog returns ONLY 3-phase candidates', () => {
      const match = matchGenerators(
        25,
        20,
        50,
        20,
        16,
        STANDARD_GENERATOR_CATALOG,
        'three'
      );
      expect(match.recommended).not.toBeNull();
      expect(match.recommended?.supportedPhases).toContain('three');
      expect(match.recommended?.supportedPhases).not.toContain('single');
    });
  });

  // ==================================================
  // 16. SINGLE-PHASE CAPACITY CEILING
  // ==================================================
  describe('16. SINGLE-PHASE CAPACITY CEILING', () => {
    it('TEST CAT3 — Load exceeding 15 kVA single-phase ceiling clearly warns no compatible generator exists', () => {
      const heavyLoad: LoadItem[] = [
        {
          id: 'large-heater',
          name: '20 kW Commercial Heater',
          category: 'General',
          quantity: 1,
          unitPower: 20,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          phase: 'single',
        },
      ];

      const result = calculateGeneratorSizing(heavyLoad, {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      expect(result.summary.recommendedGenerator).toBeNull();
      expect(
        result.summary.statedAssumptions.some((a) =>
          a.includes('Single-Phase Capacity Ceiling')
        )
      ).toBe(true);
    });
  });

  // ==================================================
  // 17. PROVISIONAL CATALOG DISCLOSURE
  // ==================================================
  describe('17. PROVISIONAL CATALOG DISCLOSURE', () => {
    it('TEST CAT4 — Recommending provisional model tags provisional reference disclosure', () => {
      const load: LoadItem[] = [
        {
          id: 'heater-5k',
          name: '4 kW Heater',
          category: 'General',
          quantity: 1,
          unitPower: 4,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          phase: 'single',
        },
      ];

      const result = calculateGeneratorSizing(load, {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      expect(result.summary.recommendedGenerator?.isProvisional).toBe(true);
      expect(result.summary.recommendedGenerator?.catalogStatus).toBe(
        'provisional_reference'
      );
      expect(
        result.summary.statedAssumptions.some((a) =>
          a.includes('Provisional Reference Data')
        )
      ).toBe(true);
    });
  });

  // ==================================================
  // 18. 3-PHASE REGRESSION TESTS (CASES A - F)
  // ==================================================
  describe('18. 3-PHASE REGRESSION TESTS (CASES A - F)', () => {
    const sys3P: ElectricalSystem = { phase: 'three', voltage: 415, frequency: 50 };

    it('CASE A: 15 HP Star-Delta -> DG-30 (30 kVA)', () => {
      const load: LoadItem[] = [
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
      const res = calculateGeneratorSizing(load, {
        electricalSystem: sys3P,
      });
      expect(res.summary.recommendedGenerator?.id).toBe('gen-30');
    });

    it('CASE B: 15 HP DOL -> DG-62.5 (62.5 kVA)', () => {
      const load: LoadItem[] = [
        {
          id: 'case-b',
          name: '15 HP Motor DOL',
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
      const res = calculateGeneratorSizing(load, {
        electricalSystem: sys3P,
      });
      expect(res.summary.recommendedGenerator?.id).toBe('gen-62.5');
    });

    it('CASE C: 10 kW heater + 10 HP DOL -> DG-40 (40 kVA)', () => {
      const load: LoadItem[] = [
        {
          id: 'case-c1',
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
          id: 'case-c2',
          name: '10 HP Motor DOL',
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
      const res = calculateGeneratorSizing(load, {
        facilityType: 'Office',
        applyDiversity: true,
        electricalSystem: sys3P,
      });
      expect(res.summary.recommendedGenerator?.id).toBe('gen-40');
    });

    it('CASE D: 2 x 5 HP DOL (Simultaneous ATS) -> DG-40 (40 kVA)', () => {
      const load: LoadItem[] = [
        {
          id: 'case-d',
          name: '5 HP DOL Pump',
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
      const res = calculateGeneratorSizing(load, {
        motorStartingSequence: 'Simultaneous',
        electricalSystem: sys3P,
      });
      expect(res.summary.recommendedGenerator?.id).toBe('gen-40');
    });

    it('CASE E: 10 kW heater + 5 HP DOL + 7.5 HP Star-Delta (No Div) -> DG-40 (40 kVA)', () => {
      const load: LoadItem[] = [
        {
          id: 'case-e1',
          name: 'Heater',
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
          id: 'case-e2',
          name: '5 HP Motor DOL',
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
          id: 'case-e3',
          name: '7.5 HP Motor Star-Delta',
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
      const res = calculateGeneratorSizing(load, {
        applyDiversity: false,
        electricalSystem: sys3P,
      });
      expect(res.summary.recommendedGenerator?.id).toBe('gen-40');
    });

    it('CASE F: 3 x 5 HP DOL (Sequential) -> DG-25 (25 kVA)', () => {
      const load: LoadItem[] = [
        {
          id: 'case-f',
          name: '5 HP Motor DOL',
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
      const res = calculateGeneratorSizing(load, {
        motorStartingSequence: 'Sequential',
        electricalSystem: sys3P,
      });
      expect(res.summary.recommendedGenerator?.id).toBe('gen-25');
    });
  });

  // ==================================================
  // 20. DATA INTEGRITY TESTS
  // ==================================================
  describe('20. DATA INTEGRITY TESTS', () => {
    it('verifies production generators have supportedPhases: [three] and production_verified', () => {
      for (const gen of PRODUCTION_THREE_PHASE_CATALOG) {
        expect(gen.supportedPhases).toEqual(['three']);
        expect(gen.catalogStatus).toBe('production_verified');
        expect(gen.isProvisional).toBeFalsy();
      }
    });

    it('verifies provisional single-phase generators have supportedPhases: [single] and provisional_reference', () => {
      for (const gen of PROVISIONAL_SINGLE_PHASE_CATALOG) {
        expect(gen.supportedPhases).toEqual(['single']);
        expect(gen.catalogStatus).toBe('provisional_reference');
        expect(gen.isProvisional).toBe(true);
      }
    });

    it('verifies no cross-contamination between catalogs', () => {
      const singleOn3P = matchGenerators(
        10,
        8,
        20,
        8,
        6.4,
        PRODUCTION_THREE_PHASE_CATALOG,
        'single'
      );
      expect(singleOn3P.recommended).toBeNull();

      const threeOn1P = matchGenerators(
        10,
        8,
        20,
        8,
        6.4,
        PROVISIONAL_SINGLE_PHASE_CATALOG,
        'three'
      );
      expect(threeOn1P.recommended).toBeNull();
    });
  });

  // ==================================================
  // 21. EDGE CASES
  // ==================================================
  describe('21. EDGE CASES', () => {
    it('TEST EDGE1: Quantity > 1 for a compatible load correctly aggregates current', () => {
      const load: LoadItem[] = [
        {
          id: 'heaters-multi',
          name: '1 kW Heaters',
          category: 'General',
          quantity: 4,
          unitPower: 1,
          powerUnit: 'kW',
          powerFactor: 1.0,
          isMotor: false,
          startingMethod: 'None',
          confidence: 'Nameplate',
          phase: 'single',
          demandFactor: 1.0,
        },
      ];

      const res = calculateGeneratorSizing(load, {
        applyDiversity: false,
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      // 4 x 1 kW = 4 kW = 4 kVA. I = 4000 / 230 = 17.39 A
      expect(res.breakdown[0].phaseStatus).toBe('Compatible');
      expect(res.summary.phaseAudit.compatibleCount).toBe(4);
      expect(res.summary.totalConnectedAmps).toBeCloseTo(17.4, 1);
    });

    it('TEST EDGE2: Quantity > 1 for an incompatible 3-phase motor on single-phase does not become compatible', () => {
      const load: LoadItem[] = [
        {
          id: 'multi-3p-motor',
          name: '3-Phase Motors',
          category: 'Motors',
          quantity: 3,
          unitPower: 5,
          powerUnit: 'HP',
          powerFactor: 0.8,
          isMotor: true,
          startingMethod: 'DOL',
          confidence: 'Nameplate',
          phase: 'three',
        },
      ];

      const res = calculateGeneratorSizing(load, {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });

      expect(res.breakdown[0].phaseStatus).toBe('Incompatible');
      expect(res.summary.phaseAudit.incompatibleCount).toBe(3);
      expect(res.summary.phaseAudit.hasIncompatibleLoads).toBe(true);
    });

    it('TEST EDGE3: Delete the only incompatible item resets incompatible count to 0', () => {
      const loadA: LoadItem = {
        id: 'heater-1',
        name: 'Heater',
        category: 'General',
        quantity: 1,
        unitPower: 2,
        powerUnit: 'kW',
        powerFactor: 1.0,
        isMotor: false,
        startingMethod: 'None',
        confidence: 'Nameplate',
        phase: 'single',
      };
      const loadB: LoadItem = {
        id: 'incompat-motor',
        name: 'Incompatible 3P Motor',
        category: 'Motors',
        quantity: 1,
        unitPower: 5,
        powerUnit: 'HP',
        powerFactor: 0.8,
        isMotor: true,
        startingMethod: 'DOL',
        confidence: 'Nameplate',
        phase: 'three',
      };

      // 1. With incompatible item
      const resWith = calculateGeneratorSizing([loadA, loadB], {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(resWith.summary.phaseAudit.incompatibleCount).toBe(1);

      // 2. Delete incompatible item
      const resWithout = calculateGeneratorSizing([loadA], {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(resWithout.summary.phaseAudit.incompatibleCount).toBe(0);
      expect(resWithout.summary.phaseAudit.hasIncompatibleLoads).toBe(false);
    });

    it('TEST EDGE4: Edit an Unknown-phase motor to 3-Phase on Single-Phase changes status from Requires Verification -> Incompatible', () => {
      const motorBase: LoadItem = {
        id: 'test-edit-motor',
        name: 'Pump',
        category: 'Motors',
        quantity: 1,
        unitPower: 5,
        powerUnit: 'HP',
        powerFactor: 0.8,
        isMotor: true,
        startingMethod: 'DOL',
        confidence: 'Nameplate',
        phase: 'unknown',
      };

      const resBefore = calculateGeneratorSizing([motorBase], {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(resBefore.breakdown[0].phaseStatus).toBe('Requires Verification');

      const resAfter = calculateGeneratorSizing([{ ...motorBase, phase: 'three' }], {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(resAfter.breakdown[0].phaseStatus).toBe('Incompatible');
    });

    it('TEST EDGE5: Edit 3-Phase motor to Single-Phase on Single-Phase changes status Incompatible -> Compatible', () => {
      const motor3P: LoadItem = {
        id: 'test-edit-motor',
        name: 'Pump',
        category: 'Motors',
        quantity: 1,
        unitPower: 5,
        powerUnit: 'HP',
        powerFactor: 0.8,
        isMotor: true,
        startingMethod: 'DOL',
        confidence: 'Nameplate',
        phase: 'three',
      };

      const resBefore = calculateGeneratorSizing([motor3P], {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(resBefore.breakdown[0].phaseStatus).toBe('Incompatible');

      const resAfter = calculateGeneratorSizing([{ ...motor3P, phase: 'single' }], {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(resAfter.breakdown[0].phaseStatus).toBe('Compatible');
    });

    it('TEST EDGE6: Switch from Single-Phase to 3-Phase with an Unknown-phase load preserves Requires Verification', () => {
      const unknownLoad: LoadItem = {
        id: 'unknown-load',
        name: 'Mystery Motor',
        category: 'Motors',
        quantity: 1,
        unitPower: 5,
        powerUnit: 'HP',
        powerFactor: 0.8,
        isMotor: true,
        startingMethod: 'DOL',
        confidence: 'Estimated',
        phase: 'unknown',
      };

      // Single-Phase:
      const res1P = calculateGeneratorSizing([unknownLoad], {
        electricalSystem: { phase: 'single', voltage: 230, frequency: 50 },
      });
      expect(res1P.breakdown[0].phaseStatus).toBe('Requires Verification');

      // Switch to 3-Phase:
      const res3P = calculateGeneratorSizing([unknownLoad], {
        electricalSystem: { phase: 'three', voltage: 415, frequency: 50 },
      });
      expect(res3P.breakdown[0].phaseStatus).toBe('Requires Verification');
    });
  });
});
