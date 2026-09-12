# GenQuote — Load Calculation Engine & Web Test Bench

An electrical sizing and defensibility calculation engine for generator dealerships, grounded in authoritative electrical standards (**IEEE Std 399-1997**, **NEMA MG 1-2016**, **IEC 60947-4-1**, and **ISO 8528-5**).

Accompanied by an interactive React + Tailwind test bench UI to verify load scenarios, motor starting surges, operating headroom, and quotation disclosures before deploying to the mobile sales app.

---

## Features

- **Pure Calculation Engine (`src/engine/`)**: Zero UI dependencies, testable independently with 100% test coverage.
- **True Vector Power Math**: Computes Active Power ($P$ in kW) and Reactive Power ($Q$ in kVAR) using vector summation ($\sqrt{P^2 + Q^2}$) to determine true system Power Factor ($\cos\varphi$).
- **Grounded Motor Starting Inrush**:
  - Direct-On-Line (DOL): $6.0\times$ (IEEE 399 / NEMA MG-1 Code G)
  - Star-Delta: $3.0\times$ (IEC 60947-4-1)
  - Soft Starter: $2.5\times$ (Solid-state SCR current limit)
  - Variable Frequency Drive (VFD): $1.2\times$ (Soft ramp-up)
  - Inverter AC / BLDC: $1.2\times$
  - Conventional Rotary Compressor: $3.5\times$
  - Support for custom multipliers and NEMA Code Letters (A through K).
- **Dual Starting Sequence Modes**:
  - **Sequential Start**: Staggered motor starting with running loads energized.
  - **Simultaneous / ATS Block Start**: Evaluates all connected motors re-accelerating concurrently across mains failure transfer.
- **Facility Diversity Profiles**: Calibrated coincidence factors for Commercial Office, Industrial Manufacturing, Retail Showrooms, and Healthcare Hospitals.
- **Real Alternator Transient Ratings**: Factory motor starting kVA ($SKVA$ at 30% sustained voltage dip) from Stamford / Leroy-Somer CPCB IV+ datasheets.
- **Audit Ruleset Versioning**: Stamps every quote with `engineVersion` (e.g. `v1.1.0-ieee399`) and an immutable snapshot of all active factors for future legal & commercial dispute defense.
- **TBD / Unknown Load Governance**: Flags unrated equipment as *Information Required* without breaking calculation flow, issuing defensible cautionary disclosures on the quotation.

---

## Quick Start

### Installation

```bash
npm install
```

### Run Web Test Bench

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Automated Unit Tests

```bash
npm test
```

### Production Build

```bash
npm run build
```

---

## Engine Ruleset & Standards Reference

* **IEEE Std 399-1997**: Recommended Practice for Industrial and Commercial Power Systems Analysis (Brown Book).
* **ANSI/NEMA MG 1-2016**: Motors and Generators, Table 10-22 (Locked-Rotor kVA/HP Code Letters).
* **IEC 60947-4-1**: Contactors and Motor-Starters (Star-Delta Reduced Voltage Inrush).
* **ISO 8528-1 / ISO 8528-5**: Reciprocating Internal Combustion Engine Driven Alternating Current Generating Sets (Class G2/G3 Step Loading).
