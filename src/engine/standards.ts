/**
 * Authoritative Electrical Standards References & Engineering Citations
 * Grounding calculation multipliers and sizing rules for legal & engineering defensibility.
 */

export interface StandardCitation {
  id: string;
  standard: string;
  title: string;
  section: string;
  summary: string;
  urlOrRef: string;
}

export const ELECTRICAL_STANDARDS: Record<string, StandardCitation> = {
  IEEE_399: {
    id: 'IEEE_399',
    standard: 'IEEE Std 399-1997 (Brown Book)',
    title: 'Recommended Practice for Industrial and Commercial Power Systems Analysis',
    section: 'Chapter 9: Motor-Starting Studies & Table 9-1',
    summary:
      'Defines locked-rotor inrush dynamics. Standard squirrel-cage induction motors typically draw 5.5x to 7.0x full-load current (Code G average 6.0x) during full-voltage starting (Direct-On-Line).',
    urlOrRef: 'IEEE Std 399-1997 R2005 / ISBN 1-55937-968-5',
  },
  NEMA_MG1: {
    id: 'NEMA_MG1',
    standard: 'NEMA MG 1-2016',
    title: 'Motors and Generators',
    section: 'Part 10.37 & Table 10-22: Locked-Rotor kVA/HP Code Letters',
    summary:
      'Categorizes motor starting kVA per rated horsepower. Letter G (standard for NEMA Design B) is 5.60 to 6.29 kVA/HP. Letter F is 5.00 to 5.59 kVA/HP. Letter H is 6.30 to 7.09 kVA/HP.',
    urlOrRef: 'ANSI/NEMA MG 1-2016, Table 10-22',
  },
  IEC_60034: {
    id: 'IEC_60034',
    standard: 'IEC 60034-12 (Ed. 3.0)',
    title: 'Rotating Electrical Machines — Part 12: Starting Performance of Single-Speed Three-Phase Cage Induction Motors',
    section: 'Clause 6: Starting Current Multipliers (Design N & H)',
    summary:
      'Specifies maximum locked-rotor apparent power and current ratios. Normal starting torque cage motors (Design N) exhibit locked-rotor currents between 5.5x and 7.8x rated full-load current.',
    urlOrRef: 'IEC 60034-12:2016',
  },
  IEC_60947_4: {
    id: 'IEC_60947_4',
    standard: 'IEC 60947-4-1',
    title: 'Low-Voltage Switchgear and Controlgear — Part 4-1: Contactors and Motor-Starters',
    section: 'Star-Delta Starters (Reduced Voltage Starting)',
    summary:
      'Star-Delta connection reduces line voltage to windings by 1/√3 (~58%), reducing starting torque and starting inrush current to 1/3 (approx 33%) of the DOL locked-rotor current (~2.0x to 3.0x rated current).',
    urlOrRef: 'IEC 60947-4-1:2018',
  },
  ISO_8528: {
    id: 'ISO_8528',
    standard: 'ISO 8528-1 / ISO 8528-5',
    title: 'Reciprocating Internal Combustion Engine Driven Alternating Current Generating Sets',
    section: 'Part 1: Application, Ratings and Performance; Part 5: Generating Sets',
    summary:
      'Specifies operating class G2/G3 voltage dip and frequency recovery criteria for step loading. Alternators are typically evaluated for maximum 30% transient voltage dip during motor starting (SKVA).',
    urlOrRef: 'ISO 8528-1:2018, ISO 8528-5:2022',
  },
};

export interface NemaCodeLetter {
  letter: string;
  minKvaPerHp: number;
  maxKvaPerHp: number;
  typicalMultiplier: number;
  description: string;
}

export const NEMA_CODE_LETTERS: Record<string, NemaCodeLetter> = {
  A: { letter: 'A', minKvaPerHp: 0.0, maxKvaPerHp: 3.14, typicalMultiplier: 3.0, description: 'Extremely low starting inrush (Specialty high-resistance rotor)' },
  B: { letter: 'B', minKvaPerHp: 3.15, maxKvaPerHp: 3.54, typicalMultiplier: 3.3, description: 'Very low inrush' },
  C: { letter: 'C', minKvaPerHp: 3.55, maxKvaPerHp: 3.99, typicalMultiplier: 3.8, description: 'Low inrush' },
  D: { letter: 'D', minKvaPerHp: 4.0, maxKvaPerHp: 4.49, typicalMultiplier: 4.2, description: 'Medium-low inrush' },
  E: { letter: 'E', minKvaPerHp: 4.5, maxKvaPerHp: 4.99, typicalMultiplier: 4.7, description: 'Sub-standard inrush' },
  F: { letter: 'F', minKvaPerHp: 5.0, maxKvaPerHp: 5.59, typicalMultiplier: 5.3, description: 'Common energy-efficient motors (IE3/IE4)' },
  G: { letter: 'G', minKvaPerHp: 5.6, maxKvaPerHp: 6.29, typicalMultiplier: 6.0, description: 'Standard Industry Design B Motor (Most common default)' },
  H: { letter: 'H', minKvaPerHp: 6.3, maxKvaPerHp: 7.09, typicalMultiplier: 6.7, description: 'High starting torque induction motor' },
  J: { letter: 'J', minKvaPerHp: 7.1, maxKvaPerHp: 7.99, typicalMultiplier: 7.5, description: 'Very high inrush' },
  K: { letter: 'K', minKvaPerHp: 8.0, maxKvaPerHp: 8.99, typicalMultiplier: 8.5, description: 'Severe inrush (Submersible borewell pumps)' },
};

export const ENGINEERING_DISCLAIMER = 
  'Notice: Sizing recommendations are generated using standard electrical rules of thumb (IEEE 399, NEMA MG-1, ISO 8528). Actual starting performance depends on motor inertia (J), load torque characteristics (variable vs constant torque), and alternator sub-transient reactance (X"d). A certified electrical consultant should verify final equipment submittals before procurement.';
