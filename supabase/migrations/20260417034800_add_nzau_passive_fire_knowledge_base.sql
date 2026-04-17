/*
  # NZ/AU Passive Fire Intelligence Knowledge Base

  ## Summary
  Creates a structured, queryable knowledge base for NZ/AU passive fire protection,
  protective coatings, and firestopping products, manufacturers, and standards.

  ## New Tables
  - `pf_manufacturers` — master manufacturer list with product category tags
  - `pf_products` — product library linked to manufacturers
  - `pf_standards` — standards and code clauses
  - `pf_defect_library` — defect definitions per system type with severity and remediation guidance

  ## Security
  - RLS enabled on all tables
  - Authenticated users can SELECT (read-only reference data)
  - No user-level INSERT/UPDATE/DELETE
*/

-- ============================================================
-- MANUFACTURERS
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  region text NOT NULL DEFAULT 'NZ/AU',
  categories text[] NOT NULL DEFAULT '{}',
  website text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pf_manufacturers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read manufacturers"
  ON pf_manufacturers FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES pf_manufacturers(id) ON DELETE CASCADE,
  name text NOT NULL,
  system_type text NOT NULL,
  product_family text,
  description text,
  typical_dft_min_mm numeric,
  typical_dft_max_mm numeric,
  substrate_types text[] DEFAULT '{}',
  applicable_frls text[] DEFAULT '{}',
  standards_refs text[] DEFAULT '{}',
  region text NOT NULL DEFAULT 'NZ/AU',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pf_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products"
  ON pf_products FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_pf_products_system_type ON pf_products(system_type);
CREATE INDEX IF NOT EXISTS idx_pf_products_manufacturer ON pf_products(manufacturer_id);

-- ============================================================
-- STANDARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  jurisdiction text NOT NULL,
  category text NOT NULL,
  summary text,
  superseded_by text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pf_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read standards"
  ON pf_standards FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- DEFECT LIBRARY
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_defect_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_type text NOT NULL,
  defect_type text NOT NULL,
  severity_default text NOT NULL CHECK (severity_default IN ('Low', 'Medium', 'High')),
  description text NOT NULL,
  likely_causes text[] DEFAULT '{}',
  inspection_checks text[] DEFAULT '{}',
  remediation_summary text,
  standards_refs text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pf_defect_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read defect library"
  ON pf_defect_library FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_pf_defect_library_system_type ON pf_defect_library(system_type);

-- ============================================================
-- SEED: MANUFACTURERS
-- ============================================================
INSERT INTO pf_manufacturers (slug, name, region, categories, website, notes) VALUES
  ('hilti', 'Hilti', 'NZ/AU', ARRAY['Firestopping', 'Mechanical'], 'https://www.hilti.co.nz', 'CP series: CP 601, CP 606, CP 620 collars. Widely specified in NZ commercial projects.'),
  ('sika', 'Sika NZ', 'NZ/AU', ARRAY['Firestopping', 'Adhesives'], 'https://www.sika.com/en/nz.html', 'Pyroplug and Pyroflex firestopping range. Sikaflex for non-rated sealing (distinguish carefully).'),
  ('3m-fire', '3M Fire Protection Products', 'NZ/AU', ARRAY['Firestopping'], 'https://www.3m.com/3M/en_US/fire-protection-us/', 'Fire Barrier sealants, pillows, wrap strips. CP 25WB+ commonly seen in NZ.'),
  ('promat', 'Promat NZ', 'NZ/AU', ARRAY['Firestopping', 'Cementitious', 'Board Systems'], 'https://www.promat.com/en-nz/', 'Promaseal range (sealants, collars). Durasteel and Promatect board systems.'),
  ('fsi', 'FSi Fire & Sound Insulation', 'AU/NZ', ARRAY['Firestopping'], 'https://www.fsi.net.au', 'Fireflex foam, FSi sealants. Distributed widely in NZ via fire contractors.'),
  ('tremco', 'Tremco CPG', 'NZ/AU', ARRAY['Firestopping'], 'https://www.tremcosealants.com', 'Fyre-Shield sealant, Fyre-Silicone. Building envelope and fire sealing.'),
  ('nullifire', 'Nullifire (Tremco group)', 'NZ/AU', ARRAY['Intumescent', 'Firestopping'], 'https://www.nullifire.com', 'SC902 intumescent coating, TC range. Popular on structural steelwork in NZ.'),
  ('jotun', 'Jotun NZ', 'NZ/AU', ARRAY['Protective Coating', 'Intumescent'], 'https://www.jotun.com/nz/', 'Steelmaster (intumescent), Hardtop (polyurethane topcoat), Jotamastic (epoxy primer).'),
  ('carboline', 'Carboline', 'NZ/AU', ARRAY['Protective Coating', 'Intumescent'], 'https://www.carboline.com', 'Carboguard epoxy MIO, Carbozinc zinc-rich primer.'),
  ('international', 'International Paint (Akzo Nobel)', 'NZ/AU', ARRAY['Protective Coating', 'Intumescent'], 'https://www.international-pc.com', 'Interzinc zinc-rich, Interzone epoxy, Intergard MIO.'),
  ('sherwin-williams', 'Sherwin-Williams Protective & Marine', 'NZ/AU', ARRAY['Protective Coating'], 'https://www.sherwin-williams.com/protective', 'Zinc Clad zinc-rich primers, Macropoxy epoxy series.'),
  ('isolatek', 'Isolatek International (Cafco)', 'NZ/AU', ARRAY['Cementitious'], 'https://www.isolatek.com', 'Cafco 300 (wet-mix spray), Cafco 400 (medium density). Most common cementitious SFRM in NZ.'),
  ('gcp-grace', 'GCP Applied Technologies (W.R. Grace)', 'NZ/AU', ARRAY['Cementitious'], 'https://www.gcpat.com', 'Monokote MK-6/HY cementitious fireproofing. High density for heavy exposure.'),
  ('promatect', 'Promat Board Systems', 'NZ/AU', ARRAY['Cementitious', 'Board Systems'], 'https://www.promat.com/en-nz/', 'Promatect-H, Promatect-L500 calcium silicate boards for column and beam encasement.'),
  ('chartek', 'AkzoNobel Chartek', 'NZ/AU', ARRAY['Intumescent'], 'https://www.chartek.com', 'Chartek 7 and Chartek 8 epoxy intumescent for hydrocarbon fire exposure.'),
  ('envirograf', 'Envirograf / Pyroplex', 'NZ/AU', ARRAY['Firestopping', 'Intumescent'], NULL, 'Pipe collars, intumescent strips, linear joint seals.')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: PRODUCTS (done one batch at a time to avoid variable scope issues)
-- ============================================================

-- Firestopping — Hilti
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'CP 601S Intumescent Sealant', 'Firestopping', 'intumescent_sealant',
  'Acrylic intumescent firestop sealant for linear joints and small penetrations. Paintable. Typical joints up to 50mm.',
  ARRAY['Concrete', 'Masonry', 'Gypsum wallboard'],
  ARRAY['-/60/60', '-/90/90', '-/120/120'],
  ARRAY['AS 4072.1', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'hilti';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'CP 606 Flexible Firestop Sealant', 'Firestopping', 'intumescent_sealant',
  'Flexible silicone-based firestop sealant. Maintains integrity under building movement. Suitable for construction joints.',
  ARRAY['Concrete', 'Masonry', 'Steel'],
  ARRAY['-/60/60', '-/120/120'],
  ARRAY['AS 4072.1']
FROM pf_manufacturers WHERE slug = 'hilti';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'CP 620 Pipe Collar', 'Firestopping', 'firestopping_collar_wrap',
  'Intumescent pipe collar for combustible and non-combustible pipes through fire-rated walls and floors. Sizes 40–315mm OD.',
  ARRAY['Concrete', 'Masonry', 'Gypsum wallboard'],
  ARRAY['-/60/60', '-/90/90', '-/120/120', '-/180/180', '-/240/240'],
  ARRAY['AS 4072.1', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'hilti';

-- Firestopping — Sika
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Sika Pyroplug', 'Firestopping', 'firestopping_pillow',
  'Rigid endothermic plug for cable transit and small multiple-service penetrations. Re-enterable.',
  ARRAY['Concrete', 'Masonry'],
  ARRAY['-/60/60', '-/120/120'],
  ARRAY['AS 4072.1']
FROM pf_manufacturers WHERE slug = 'sika';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Sikaflex Pyroflex', 'Firestopping', 'intumescent_sealant',
  'Elastic intumescent firestop sealant for movement joints in fire-rated walls and floors.',
  ARRAY['Concrete', 'Masonry', 'Gypsum wallboard'],
  ARRAY['-/60/60', '-/120/120'],
  ARRAY['AS 4072.1', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'sika';

-- Firestopping — 3M
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Fire Barrier CP 25WB+ Sealant', 'Firestopping', 'intumescent_sealant',
  'Water-based intumescent sealant. Common in NZ. Suitable for metallic and combustible pipes, cables, cable trays.',
  ARRAY['Concrete', 'Masonry', 'Gypsum wallboard'],
  ARRAY['-/60/60', '-/90/90', '-/120/120'],
  ARRAY['AS 4072.1', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = '3m-fire';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Fire Barrier Wrap Strip 869', 'Firestopping', 'firestopping_collar_wrap',
  'Intumescent wrap strip for combustible pipe through walls and floors. Field-cut. Intumesces to seal annular space as pipe melts.',
  ARRAY['Concrete', 'Masonry'],
  ARRAY['-/60/60', '-/120/120'],
  ARRAY['AS 4072.1']
FROM pf_manufacturers WHERE slug = '3m-fire';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Fire Barrier Pillows FB', 'Firestopping', 'firestopping_pillow',
  'Flexible intumescent pillows for large cable bundle and multi-service penetrations. Removable/re-enterable.',
  ARRAY['Concrete', 'Masonry'],
  ARRAY['-/60/60', '-/120/120'],
  ARRAY['AS 4072.1']
FROM pf_manufacturers WHERE slug = '3m-fire';

-- Firestopping — Promat
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Promaseal A Acrylic Sealant', 'Firestopping', 'intumescent_sealant',
  'Paintable acrylic firestop sealant for linear joints and service penetrations.',
  ARRAY['Concrete', 'Masonry', 'Gypsum wallboard'],
  ARRAY['-/60/60', '-/120/120'],
  ARRAY['AS 4072.1']
FROM pf_manufacturers WHERE slug = 'promat';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Promaseal Collar', 'Firestopping', 'firestopping_collar_wrap',
  'Intumescent collar for plastic pipes. Pre-formed halves bolted around pipe at wall/floor face.',
  ARRAY['Concrete', 'Masonry'],
  ARRAY['-/60/60', '-/120/120', '-/180/180'],
  ARRAY['AS 4072.1']
FROM pf_manufacturers WHERE slug = 'promat';

-- Firestopping — FSi
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'FSi Fireflex Sealant', 'Firestopping', 'intumescent_sealant',
  'Flexible intumescent firestop sealant. Available in grey and grey-white. Common in NZ apartment and commercial.',
  ARRAY['Concrete', 'Masonry', 'Gypsum wallboard'],
  ARRAY['-/60/60', '-/90/90', '-/120/120'],
  ARRAY['AS 4072.1', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'fsi';

-- Firestopping — Tremco
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Fyre-Shield Sealant', 'Firestopping', 'intumescent_sealant',
  'Intumescent acrylic firestop sealant. Suitable for linear joints and service penetrations.',
  ARRAY['Concrete', 'Masonry', 'Steel', 'Gypsum wallboard'],
  ARRAY['-/60/60', '-/120/120'],
  ARRAY['AS 4072.1']
FROM pf_manufacturers WHERE slug = 'tremco';

-- Intumescent — Nullifire
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'SC902 Intumescent Coating', 'Intumescent', 'water_based_intumescent',
  'Solvent-free water-based intumescent. Common structural steel specification in NZ. Applied by brush, roller, or airless spray.',
  0.5, 6.0,
  ARRAY['Structural steel', 'Hollow section'],
  ARRAY['-/30/30', '-/60/60', '-/90/90', '-/120/120'],
  ARRAY['AS 1530.4', 'NZBC C/AS1', 'ISO 834']
FROM pf_manufacturers WHERE slug = 'nullifire';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'TC950 Topcoat', 'Intumescent', 'water_based_intumescent',
  'Decorative topcoat compatible with SC902. UV and weather resistant. Required for external or semi-exposed applications.',
  0.05, 0.1,
  ARRAY['Intumescent overcoat'],
  ARRAY[]::text[],
  ARRAY['AS/NZS 1580']
FROM pf_manufacturers WHERE slug = 'nullifire';

-- Intumescent — Jotun
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Steelmaster 60 WB', 'Intumescent', 'water_based_intumescent',
  'Water-based intumescent for structural steel. 30–120 min FRL depending on DFT and section factor. Popular in NZ commercial.',
  0.4, 5.5,
  ARRAY['Structural steel', 'Hollow section'],
  ARRAY['-/30/30', '-/60/60', '-/90/90', '-/120/120'],
  ARRAY['AS 1530.4', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'jotun';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Steelmaster 120 SB', 'Intumescent', 'solvent_based_intumescent',
  'Solvent-based intumescent. Suitable for external/marine environments. Longer recoat window than WB.',
  0.5, 8.0,
  ARRAY['Structural steel', 'Hollow section'],
  ARRAY['-/60/60', '-/90/90', '-/120/120', '-/180/180'],
  ARRAY['AS 1530.4', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'jotun';

-- Intumescent — Chartek
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Chartek 7', 'Intumescent', 'epoxy_intumescent',
  'Two-part epoxy intumescent for hydrocarbon pool fire and jet fire scenarios. Offshore and petrochemical.',
  5.0, 30.0,
  ARRAY['Structural steel'],
  ARRAY['-/60/60', '-/90/90', '-/120/120'],
  ARRAY['AS 1530.4', 'ISO 22899-1']
FROM pf_manufacturers WHERE slug = 'chartek';

-- Cementitious — Isolatek
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Cafco 300 Spray Fireproofing', 'Cementitious', 'cementitious_lightweight',
  'Wet-mix cementitious spray-applied fireproofing. Vermiculite aggregate. Light density ~230 kg/m3. Most common SFRM product in NZ commercial.',
  12.0, 50.0,
  ARRAY['Structural steel', 'Concrete deck soffit'],
  ARRAY['-/60/60', '-/90/90', '-/120/120', '-/180/180', '-/240/240'],
  ARRAY['AS 1530.4', 'ASTM E119', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'isolatek';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Cafco 400 Medium Density', 'Cementitious', 'cementitious_dense',
  'Medium density cementitious SFRM (~400 kg/m3). Higher cohesive strength than 300. Use where impact or abrasion risk present.',
  12.0, 50.0,
  ARRAY['Structural steel', 'Concrete'],
  ARRAY['-/60/60', '-/90/90', '-/120/120', '-/180/180', '-/240/240'],
  ARRAY['AS 1530.4', 'ASTM E119', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'isolatek';

-- Cementitious — GCP
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Monokote MK-6', 'Cementitious', 'cementitious_lightweight',
  'Original Monokote wet-mix SFRM. Cement and perlite aggregate. Low density ~240 kg/m3. Widely tested to UL/ULC listings.',
  12.0, 50.0,
  ARRAY['Structural steel', 'Concrete deck soffit'],
  ARRAY['-/60/60', '-/90/90', '-/120/120', '-/180/180', '-/240/240'],
  ARRAY['AS 1530.4', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'gcp-grace';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Monokote MK-HY High Yield', 'Cementitious', 'cementitious_dense',
  'High-yield formulation for better cohesion. Suitable for areas with vibration or higher humidity. Medium density.',
  15.0, 50.0,
  ARRAY['Structural steel'],
  ARRAY['-/60/60', '-/90/90', '-/120/120', '-/180/180'],
  ARRAY['AS 1530.4', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'gcp-grace';

-- Cementitious — Promat boards
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Promatect-H Board', 'Cementitious', 'board_system',
  'Calcium silicate board. Dense, high-temperature resistant. Used for column/beam box encasement where spray not suitable.',
  15.0, 40.0,
  ARRAY['Structural steel', 'Columns', 'Beams'],
  ARRAY['-/60/60', '-/90/90', '-/120/120', '-/180/180', '-/240/240'],
  ARRAY['AS 1530.4', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'promatect';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, typical_dft_min_mm, typical_dft_max_mm, substrate_types, applicable_frls, standards_refs)
SELECT id, 'Promatect-L500 Board', 'Cementitious', 'board_system',
  'Lightweight calcium silicate board. Easier handling. Used for soffit linings, false ceilings, duct protection.',
  20.0, 50.0,
  ARRAY['Structural steel', 'Concrete', 'Masonry'],
  ARRAY['-/60/60', '-/90/90', '-/120/120'],
  ARRAY['AS 1530.4', 'NZBC C/AS1']
FROM pf_manufacturers WHERE slug = 'promatect';

-- Protective Coating — Jotun
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, standards_refs)
SELECT id, 'Jotamastic 87', 'Protective Coating', 'epoxy_mastic',
  'Surface-tolerant epoxy mastic. Can be applied over hand-tooled or power-tooled steel. Common maintenance coat.',
  ARRAY['Steel', 'Aged coatings'],
  ARRAY['ISO 12944', 'AS/NZS 2312']
FROM pf_manufacturers WHERE slug = 'jotun';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, standards_refs)
SELECT id, 'Hardtop AX', 'Protective Coating', 'polyurethane_topcoat',
  'Two-component polyurethane topcoat. High gloss, excellent UV and chemical resistance. C4/C5 environments.',
  ARRAY['Steel', 'Epoxy primer'],
  ARRAY['ISO 12944', 'AS/NZS 2312']
FROM pf_manufacturers WHERE slug = 'jotun';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, standards_refs)
SELECT id, 'Resist 86', 'Protective Coating', 'zinc_rich_primer',
  'Epoxy zinc-rich primer. 85% zinc dust by weight in dry film. Galvanic cathodic protection. C3-C5M environments.',
  ARRAY['Blast-cleaned steel'],
  ARRAY['ISO 12944', 'AS/NZS 2312', 'ISO 8501-1']
FROM pf_manufacturers WHERE slug = 'jotun';

-- Protective Coating — Carboline
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, standards_refs)
SELECT id, 'Carboguard 890', 'Protective Coating', 'epoxy_mastic',
  'High-build epoxy mastic. Excellent adhesion. Widely used on structural steel and infrastructure.',
  ARRAY['Steel', 'Concrete'],
  ARRAY['ISO 12944', 'AS/NZS 2312']
FROM pf_manufacturers WHERE slug = 'carboline';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, standards_refs)
SELECT id, 'Carbozinc 11', 'Protective Coating', 'zinc_rich_primer',
  'Inorganic zinc silicate primer. High performance, excellent hot climate performance. C4-C5 environments.',
  ARRAY['Blast-cleaned steel Sa 2.5'],
  ARRAY['ISO 12944', 'SSPC-Paint 20', 'ISO 8501-1']
FROM pf_manufacturers WHERE slug = 'carboline';

-- Protective Coating — International
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, standards_refs)
SELECT id, 'Interzinc 52', 'Protective Coating', 'zinc_rich_primer',
  'Epoxy zinc-rich primer. Rapid dry. Suitable for splash zones and C4-C5M environments.',
  ARRAY['Blast-cleaned steel'],
  ARRAY['ISO 12944', 'AS/NZS 2312']
FROM pf_manufacturers WHERE slug = 'international';

INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, standards_refs)
SELECT id, 'Interzone 954', 'Protective Coating', 'epoxy_mastic',
  'Solvent-free epoxy. Suitable for immersion service. Used in ballast tanks and below-waterline marine.',
  ARRAY['Steel', 'Concrete'],
  ARRAY['ISO 12944', 'ISO 15741']
FROM pf_manufacturers WHERE slug = 'international';

-- Protective Coating — Sherwin-Williams
INSERT INTO pf_products (manufacturer_id, name, system_type, product_family, description, substrate_types, standards_refs)
SELECT id, 'Zinc Clad IV', 'Protective Coating', 'zinc_rich_primer',
  'Organic zinc-rich epoxy primer. B1/B2 surface prep acceptable. Common in maintenance painting.',
  ARRAY['Steel'],
  ARRAY['ISO 12944', 'SSPC-Paint 20']
FROM pf_manufacturers WHERE slug = 'sherwin-williams';

-- ============================================================
-- SEED: STANDARDS
-- ============================================================
INSERT INTO pf_standards (code, title, jurisdiction, category, summary) VALUES
  ('NZBC C/AS1', 'New Zealand Building Code Clause C — Protection from Fire (Acceptable Solution 1)', 'NZ', 'Building Code', 'Primary NZ code for fire resistance, compartmentation, and passive fire protection. References FRL system and component requirements.'),
  ('AS 1530.4', 'Methods for Fire Tests on Building Materials, Components and Structures — Part 4: Fire-Resistance Test of Elements of Construction', 'NZ/AU', 'Test Standard', 'The primary fire resistance test method for NZ and Australian construction products. FRL expressed as Structural Adequacy/Integrity/Insulation in minutes.'),
  ('AS 4072.1', 'Components for the Protection of Openings in Fire-Resistant Separating Elements — Service Penetrations and Control Joints', 'NZ/AU', 'Firestopping', 'Test and classification standard for firestopping products. All firestopping products in NZ/AU should have AS 4072.1 assessment.'),
  ('AS/NZS 2312', 'Guide to the Protection of Structural Steel Against Atmospheric Corrosion by the Use of Protective Coatings', 'NZ/AU', 'Protective Coating', 'Core guidance for corrosivity classification (categories A-E matching ISO C1-C5), surface preparation, and coating selection for NZ/AU climates.'),
  ('ISO 12944', 'Paints and Varnishes — Corrosion Protection of Steel Structures by Protective Paint Systems', 'International', 'Protective Coating', 'International standard for corrosivity categories C1-C5 and Im1-Im3. Widely referenced alongside AS/NZS 2312 in NZ specifications.'),
  ('ISO 4628-3', 'Paints and Varnishes — Evaluation of Degradation of Coatings — Part 3: Assessment of Degree of Rusting', 'International', 'Protective Coating', 'Rust grading scale Ri 0 (no rust) to Ri 5 (>40% rusted). Critical for DFT-related inspection and reporting corrosion breakthrough severity.'),
  ('ISO 8501-1', 'Preparation of Steel Substrates Before Application of Paints and Related Products — Part 1: Rust Grades and Preparation Grades of Uncoated Steel Substrates', 'International', 'Protective Coating', 'Surface cleanliness grades Sa 1-Sa 3 (blast) and St 2/St 3 (tool). Referenced in all protective coating specifications.'),
  ('AS/NZS 1580', 'Paints and Related Materials — Methods of Test', 'NZ/AU', 'Protective Coating', 'Methods for DFT measurement, adhesion testing, gloss, flexibility. Referenced in inspection and compliance testing.'),
  ('ISO 834', 'Fire-Resistance Tests — Elements of Building Construction', 'International', 'Intumescent / Cementitious', 'Standard time-temperature curve for cellulosic fire. Basis for most FRL assessments in NZ/AU building construction.'),
  ('ISO 22899-1', 'Determination of the Resistance to Jet Fires of Passive Fire Protection Materials — Part 1: General Requirements', 'International', 'Intumescent', 'Jet fire resistance test for epoxy intumescent and other PFP used in hydrocarbon processing and offshore environments.'),
  ('NZBC C/AS2', 'New Zealand Building Code Clause C — Protection from Fire (Acceptable Solution 2 — Buildings with Sleeping)', 'NZ', 'Building Code', 'Extends C/AS1 for buildings with sleeping occupants. Higher FRL requirements and more stringent compartmentation.'),
  ('ASTM E119', 'Standard Test Methods for Fire Tests of Building Construction and Materials', 'US/International', 'Test Standard', 'US fire resistance test method. Many Cafco/Monokote cementitious systems are listed to ASTM E119 via UL. Referenced in manufacturer data sheets used in NZ.')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: DEFECT LIBRARY
-- ============================================================
INSERT INTO pf_defect_library (system_type, defect_type, severity_default, description, likely_causes, inspection_checks, remediation_summary, standards_refs) VALUES

  ('Cementitious', 'Spalling — With Substrate Exposure', 'High',
   'Chunks or sections of cementitious SFRM have detached, exposing bare steel or concrete substrate. FRL continuity is compromised.',
   ARRAY['Impact damage', 'Seismic movement', 'Adhesion failure at application', 'Moisture freeze-thaw cycle', 'Incompatible primer'],
   ARRAY['Identify and measure exposed area', 'Check adjacent material for delamination (tap test)', 'Measure remaining DFT at boundary', 'Photograph and map extent on drawing'],
   'Remove all loose material. Clean exposed substrate. Re-apply matching SFRM product per manufacturer data sheet to required DFT. Verify DFT before over-coating. Do not use PU foam as filler.',
   ARRAY['AS 1530.4', 'NZBC C/AS1']),

  ('Cementitious', 'Spalling — No Substrate Exposure', 'Medium',
   'Surface spalling visible but substrate not yet exposed. Risk of progressive delamination.',
   ARRAY['Impact damage', 'Micro-cracking from vibration', 'Moisture cycling', 'Adhesion beginning to fail'],
   ARRAY['Tap test entire affected zone to detect hollow areas', 'Measure DFT — if below minimum, escalate to High', 'Check for hairline cracks connecting spalled areas'],
   'Remove loose material. Re-apply SFRM to affected zone maintaining minimum DFT. Monitor adjacent area for progression.',
   ARRAY['AS 1530.4']),

  ('Cementitious', 'Adhesion Loss / Delamination', 'High',
   'SFRM is separating from substrate or internally delaminating. Sound indicates hollow zone. May not be visually obvious without tap testing.',
   ARRAY['Incompatible primer or contaminated steel surface', 'Application over frost or moisture', 'Excessive WB application in cold conditions', 'Mechanical vibration post-application'],
   ARRAY['Perform systematic tap test grid', 'Check for visible separation at edges', 'Compare to adjacent un-affected areas', 'Review original primer specification'],
   'Demarcate delaminated zones. Remove all loose/hollow material. Prepare substrate per manufacturer requirements. Re-apply SFRM with proper primer compatibility check.',
   ARRAY['AS 1530.4', 'NZBC C/AS1']),

  ('Cementitious', 'Full-Depth Cracking', 'High',
   'Cracks that penetrate full depth of SFRM layer to substrate. Structural integrity and FRL continuity compromised.',
   ARRAY['Building movement/settlement', 'Seismic drift', 'Thermal cycling in hot/cold environments', 'Insufficient depth for substrate profile'],
   ARRAY['Probe crack depth — confirm full-depth vs surface only', 'Measure crack width and map extent', 'Check for differential movement source'],
   'For full-depth cracks: remove 100mm each side and patch-reinstate with compatible SFRM. Investigate movement source. Consider flexible expansion joint if movement is ongoing.',
   ARRAY['AS 1530.4']),

  ('Cementitious', 'Surface Crazing', 'Low',
   'Fine surface cracks (crazing) in SFRM, not full-depth. Normal for some cementitious products especially in drying phase.',
   ARRAY['Normal shrinkage on drying', 'Exposure to sun/wind during application', 'Slight over-application'],
   ARRAY['Confirm cracks do not penetrate full depth', 'Check that DFT is maintained', 'Monitor for progression at next inspection'],
   'If DFT is maintained and cracks are surface-only: monitor only. Apply compatible sealer if moisture ingress is a concern in the specific environment.',
   ARRAY[]::text[]),

  ('Cementitious', 'Moisture Damage / Efflorescence', 'Medium',
   'White crystalline deposits (efflorescence) or staining indicating moisture migration through SFRM. May indicate hidden delamination or substrate corrosion.',
   ARRAY['Water ingress at building envelope', 'Condensation in high-humidity environments', 'Plumbing leak above'],
   ARRAY['Map extent of moisture staining', 'Check SFRM for softening or friability', 'Probe substrate for corrosion under SFRM', 'Identify water source'],
   'Address water source first. Remove any softened or friable SFRM. Allow substrate to dry. Re-apply SFRM. Consider moisture-resistant formulation in persistently wet areas.',
   ARRAY['AS 1530.4']),

  ('Cementitious', 'Surface Erosion / Powdering', 'Low',
   'SFRM surface is chalking or powdering when touched. Minor surface degradation that has not reduced DFT below minimum.',
   ARRAY['Prolonged exposure to air movement (mechanical spaces)', 'Aging of binder', 'Low-density formulation in high-traffic area'],
   ARRAY['Check DFT — if below minimum, escalate', 'Test friability', 'Determine if area has ongoing air movement or traffic risk'],
   'If DFT maintained: apply compatible sealer coat. If DFT below minimum: re-apply SFRM. Consider higher-density formulation in exposed mechanical spaces.',
   ARRAY[]::text[]),

  ('Cementitious', 'Missing at Penetration', 'High',
   'SFRM absent at or around a pipe, cable, or structural penetration. Unprotected gap that breaks FRL continuity.',
   ARRAY['Post-installation services added after fireproofing', 'Omission during original application', 'Removal during maintenance work not reinstated'],
   ARRAY['Confirm FRL requirement for element', 'Measure gap dimension', 'Check if penetration service itself is fire-rated'],
   'Reinstate SFRM to full required DFT around penetration. Ensure penetration is itself firestopped if through a rated element. Do not use foam as substitute.',
   ARRAY['AS 1530.4', 'NZBC C/AS1']),

  ('Protective Coating', 'Corrosion Breakthrough with Edge Creep', 'High',
   'Active rust visible through coating. Corrosion is advancing under the coating film (undermining/undercutting). ISO 4628-3 Ri 3-5.',
   ARRAY['Inadequate surface preparation (insufficient blast grade)', 'Coating system wrong for environment (C4/C5 not specified)', 'Edge and weld primer omission', 'DFT below minimum'],
   ARRAY['Rate to ISO 4628-3 (Ri scale)', 'Measure remaining DFT', 'Check weld seams and corners first', 'Note edge creep distance from visible rust'],
   'Remove rust to minimum St 3 (preferably Sa 2.5 blast). Re-apply full specification system per AS/NZS 2312 for environment. Stripe coat all edges and welds.',
   ARRAY['ISO 12944', 'ISO 4628-3', 'AS/NZS 2312', 'ISO 8501-1']),

  ('Protective Coating', 'Osmotic Blistering', 'High',
   'Fluid-filled blisters under coating. Electrolyte solution trapped between coating and steel. Indicates moisture penetration and incipient corrosion.',
   ARRAY['Moisture contamination of steel before application', 'Soluble salt contamination (near coastal)', 'Coating applied over dew point'],
   ARRAY['Probe blisters — note if fluid contains rust', 'Test for soluble salts if near coastal', 'Check application records for dew point compliance'],
   'Blast all blistered areas to bare steel Sa 2.5. Test for soluble salts — clean to <40 mg/m2 if present. Re-apply full system. Use low-permeability coating for coastal environments.',
   ARRAY['ISO 12944', 'AS/NZS 2312']),

  ('Protective Coating', 'Intercoat Delamination', 'Medium',
   'Coating layers separating from each other (not from substrate). Flaking in layers. Indicates adhesion failure between coats.',
   ARRAY['Recoat window exceeded', 'Surface contamination between coats', 'Incompatible products used between coats'],
   ARRAY['Pull-off adhesion test if scope allows', 'Check if substrate is sound', 'Note which layer is failing'],
   'Remove delaminated areas. Abrade sound coating. Re-apply affected coat(s) within specification recoat window. Confirm product compatibility.',
   ARRAY['ISO 12944', 'AS/NZS 1580']),

  ('Protective Coating', 'UV Chalking / Gloss Loss', 'Low',
   'Surface chalking and loss of gloss on topcoat. Cosmetic degradation of UV-unstable binder.',
   ARRAY['Alkyd or epoxy topcoat exposed to UV (should use polyurethane topcoat externally)', 'Normal aging beyond topcoat life'],
   ARRAY['Check for underlying rust', 'Check DFT — if below minimum, escalate', 'Evaluate if chalking is leading to erosion of primer'],
   'If rust-free and DFT maintained: apply compatible polyurethane topcoat. Address root cause: specify UV-stable PU topcoat for future external applications.',
   ARRAY['ISO 12944', 'AS/NZS 2312']),

  ('Protective Coating', 'Missing at Weld / Edge', 'Medium',
   'Coating absent or below minimum DFT at weld beads, cut edges, or bolt heads. Common failure point.',
   ARRAY['Stripe coat omitted during application', 'Poor technique at complex geometry', 'Post-weld contamination not addressed'],
   ARRAY['DFT measurement at welds and edges', 'Visual check for bare steel'],
   'Apply stripe coat per specification (typically minimum 2 brush stripe passes before full coat). Confirm DFT compliance.',
   ARRAY['ISO 12944', 'ISO 8501-1']),

  ('Firestopping', 'Open Penetration Gap', 'High',
   'Penetration through fire-rated wall or floor is completely unsealed. Zero fire resistance. Non-compliant.',
   ARRAY['Post-installation services added after initial fit-out', 'Sealed penetration later breached and not reinstated', 'Omission during construction'],
   ARRAY['Confirm wall/floor fire rating requirement', 'Identify penetrating service type (combustible pipe, cable, metallic)', 'Measure gap dimensions'],
   'Install appropriate tested firestopping system for the specific service and wall/floor configuration. Select system with documented AS 4072.1 assessment. Do not use PU foam.',
   ARRAY['AS 4072.1', 'NZBC C/AS1', 'NZBC C/AS2']),

  ('Firestopping', 'Non-Rated Expanding Foam Used as Firestopping', 'High',
   'Standard polyurethane (PU) expanding foam used to seal fire-rated penetration. PU foam is combustible and does not provide fire resistance. Non-compliant.',
   ARRAY['Incorrect product selection by installer', 'Cost cutting', 'Mistaken belief that any sealed penetration is compliant'],
   ARRAY['Identify foam type — non-intumescent PU foam is orange/yellow. Intumescent variants are red/grey and should have cert.', 'Request product data sheet if uncertain', 'Check for AS 4072.1 test report number'],
   'Remove all non-rated PU foam. Replace with certified firestopping system appropriate for the penetration type and rated element.',
   ARRAY['AS 4072.1', 'NZBC C/AS1']),

  ('Firestopping', 'Incomplete Seal / Partial Installation', 'High',
   'Firestopping product installed but not complete: gaps remain around penetration annulus, missing sections, or product not covering full depth of rated element.',
   ARRAY['Poor workmanship', 'Incorrect product for annular gap size', 'Service added after partial seal installed'],
   ARRAY['Measure annular gap and confirm product coverage', 'Check both faces of wall/floor element', 'Verify full depth of element is addressed'],
   'Complete the installation per product system instructions. Select intumescent product rated for the specific annular gap dimensions. Verify compliance with full AS 4072.1 test configuration.',
   ARRAY['AS 4072.1', 'NZBC C/AS1']),

  ('Firestopping', 'Sealant Shrinkage / Adhesion Loss', 'Medium',
   'Installed intumescent sealant has pulled away from substrate or cracked. Gap has reopened. Seal integrity compromised.',
   ARRAY['Excessive joint movement beyond product movement capability', 'Incorrect depth/width ratio', 'Application over wet or contaminated substrate', 'Temperature cycling stress'],
   ARRAY['Measure joint width and depth', 'Assess extent of separation', 'Check for building movement history'],
   'Remove failed sealant. Clean joint surfaces. Re-apply intumescent sealant at correct depth:width ratio per product datasheet. Use flexible firestopping sealant for moving joints.',
   ARRAY['AS 4072.1']),

  ('Firestopping', 'Post-Install Breach by New Service', 'High',
   'Previously compliant firestopped penetration has been broken through to install a new pipe, cable, or duct. New service is unfirestopped.',
   ARRAY['Later-stage fit-out added services through existing rated walls/floors', 'No hot works / penetration permit process in place'],
   ARRAY['Confirm original penetration configuration has been disturbed', 'Identify new service type', 'Assess condition of original surrounding seal'],
   'Install compliant firestopping for new service. Assess whether original surrounding seal is still intact and compliant. Recommend penetration permit process.',
   ARRAY['AS 4072.1', 'NZBC C/AS1']),

  ('Firestopping', 'Physical Damage to Installed Seal', 'Medium',
   'Installed firestopping has been physically damaged: collar knocked off, sealant abraded, pillow removed, collar loose.',
   ARRAY['Impact from materials handling', 'Vandalism or tampering', 'Collar not fixed to substrate correctly', 'Vibration from adjacent plant'],
   ARRAY['Confirm if system is fully functional despite damage', 'Check fixings on collars', 'Check seals are still adhered'],
   'Repair or replace damaged components per manufacturer instructions. For collars: confirm correct fixings reinstated. For sealants: clean and re-apply. For pillows: re-seat or replace.',
   ARRAY['AS 4072.1']),

  ('Intumescent', 'Insufficient DFT', 'High',
   'Measured dry film thickness is below the minimum required for the specified FRL. FRL cannot be demonstrated.',
   ARRAY['Application errors — too few coats', 'Inadequate mixing leading to under-density', 'DFT not checked during application'],
   ARRAY['Grid DFT readings at minimum 1 per m2', 'Compare to approved DFT schedule for section factor and FRL', 'Check application records for number of coats'],
   'Apply additional coats to bring DFT up to minimum. Confirm with DFT readings post-application. Update DFT schedule if section factor was incorrect.',
   ARRAY['AS 1530.4', 'NZBC C/AS1']),

  ('Intumescent', 'Delamination / Peeling', 'High',
   'Intumescent coating is delaminating from substrate or primer, or inter-coat peeling is occurring. FRL continuity compromised.',
   ARRAY['Incompatible primer', 'Recoat window exceeded', 'Contaminated or wet surface during application', 'Flexible substrate causing coating to fail'],
   ARRAY['Identify delamination layer — from steel, primer, or between coats', 'Measure adhesion if possible', 'Check primer compatibility with intumescent'],
   'Remove delaminated material. Reinstate compatible primer. Re-apply intumescent to full DFT. Confirm primer compatibility before application.',
   ARRAY['AS 1530.4', 'NZBC C/AS1']),

  ('Intumescent', 'Mechanical Damage', 'Medium',
   'Physical damage to intumescent coating: scrapes, gouges, cuts, impact damage that has reduced DFT below minimum.',
   ARRAY['Post-application mechanical impact', 'Trades damage during fit-out', 'Inadequate protection during construction'],
   ARRAY['Measure DFT in damaged area', 'Check extent of damage', 'Confirm no delamination adjacent to damage zone'],
   'Touch-up damaged area to full DFT. Feather edges. Apply topcoat if specified. Implement protection measures (foam padding, warning markers) for remaining construction phase.',
   ARRAY['AS 1530.4']),

  ('Intumescent', 'Topcoat Incompatibility / Cracking', 'Medium',
   'Topcoat applied over intumescent has cracked or is cracking the intumescent layer beneath. May impair intumescent expansion.',
   ARRAY['Incompatible topcoat binder (hard topcoat over soft intumescent)', 'Topcoat applied too thick', 'Rapid temperature cycling'],
   ARRAY['Check topcoat thickness', 'Check topcoat compatibility in manufacturer data', 'Look for map-cracking pattern'],
   'Remove incompatible topcoat if cracking is deep. Apply manufacturer-approved topcoat at specified DFT. Maximum topcoat DFT is usually 100-150 microns for WB intumescents.',
   ARRAY['AS 1530.4'])

ON CONFLICT DO NOTHING;

-- ============================================================
-- HELPER RPCS
-- ============================================================
CREATE OR REPLACE FUNCTION get_pf_defects_for_system(p_system_type text)
RETURNS TABLE (
  defect_type text,
  severity_default text,
  description text,
  likely_causes text[],
  inspection_checks text[],
  remediation_summary text,
  standards_refs text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT defect_type, severity_default, description, likely_causes,
         inspection_checks, remediation_summary, standards_refs
  FROM pf_defect_library
  WHERE system_type = p_system_type
  ORDER BY
    CASE severity_default WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
    defect_type;
$$;

CREATE OR REPLACE FUNCTION get_pf_products_for_system(p_system_type text)
RETURNS TABLE (
  product_name text,
  manufacturer_name text,
  product_family text,
  description text,
  applicable_frls text[],
  standards_refs text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name, m.name, p.product_family, p.description,
         p.applicable_frls, p.standards_refs
  FROM pf_products p
  JOIN pf_manufacturers m ON m.id = p.manufacturer_id
  WHERE p.system_type = p_system_type AND p.active = true
  ORDER BY m.name, p.name;
$$;
