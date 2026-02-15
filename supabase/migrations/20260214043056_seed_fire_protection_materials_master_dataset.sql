/*
  # Seed Fire Protection Materials Master Dataset

  1. Inserts
    - Seed comprehensive fire protection materials from major manufacturers
    - Sherwin-Williams Firetex series
    - PPG Steelguard and Pitt-Char series
    - Hempel Hempacore series
    - Sika Unitherm series
    - Nullifire series
    - AkzoNobel International Interchar series
    - Jotun SteelMaster series
    - Carboline series
    - Isolatek CAFCO and Fendolite series
    - Promat PROMASPRAY and PROMATECT series
    
  2. Data Mapping
    - All products properly categorized by type and application
    - Temperature, humidity, and dew point limits set
    - Inspection methods configured appropriately
*/

-- Insert Sherwin-Williams Firetex products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_section_factor, notes)
VALUES
  ('Sherwin-Williams', 'Firetex FX2000', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'High-performance thin-film intumescent coating for structural steel'),
  ('Sherwin-Williams', 'Firetex FX6002', 'Intumescent', 'Solvent-based epoxy', 'Cellulosic', 'ThinFilm_Solvent', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Solvent-based thin-film intumescent for harsh environments'),
  ('Sherwin-Williams', 'Firetex FX5000', 'Intumescent', 'Epoxy intumescent', 'Cellulosic', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, 'Epoxy intumescent for cellulosic fire protection'),
  ('Sherwin-Williams', 'Firetex FX5090', 'Intumescent', 'Epoxy intumescent', 'Hydrocarbon', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, 'Hydrocarbon fire protection system'),
  ('Sherwin-Williams', 'Firetex FX5120', 'Intumescent', 'Epoxy intumescent', 'Hydrocarbon', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, 'High-performance hydrocarbon protection'),
  ('Sherwin-Williams', 'Firetex M90/02', 'Cementitious', 'Cement-based spray', 'Cellulosic', 'Cementitious_Spray', 'mm', 0, 40, 95, 3, 'DepthPinGauge', false, 'Cementitious spray fireproofing for steel'),
  ('Sherwin-Williams', 'Firetex M90/03', 'Cementitious', 'Cement-based spray', 'Cellulosic', 'Cementitious_Spray', 'mm', 0, 40, 95, 3, 'DepthPinGauge', false, 'Lightweight cementitious fireproofing'),
  ('Sherwin-Williams', 'Firetex FX9500', 'Board', 'Board system', 'Cellulosic', 'Board_System', 'mm', -20, 50, 95, 3, 'BoardCaliper', false, 'Board fire protection system'),
  ('Sherwin-Williams', 'Firetex FX9502', 'Board', 'Board system', 'Cellulosic', 'Board_System', 'mm', -20, 50, 95, 3, 'BoardCaliper', false, 'High-density board protection')
ON CONFLICT DO NOTHING;

-- Insert PPG products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_section_factor, external_use_allowed, notes)
VALUES
  ('PPG', 'Steelguard 601', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, false, 'Water-based thin-film intumescent coating'),
  ('PPG', 'Steelguard 651', 'Intumescent', 'Solvent-based', 'Cellulosic', 'ThinFilm_Solvent', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, true, 'Solvent-based thin-film with external use approval'),
  ('PPG', 'Steelguard 701', 'Intumescent', 'Epoxy intumescent', 'Cellulosic', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, false, 'Epoxy intumescent for cellulosic protection'),
  ('PPG', 'Steelguard 702', 'Intumescent', 'Epoxy intumescent', 'Hydrocarbon', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, true, 'Epoxy intumescent for hydrocarbon scenarios'),
  ('PPG', 'Pitt-Char XP', 'Intumescent', 'Epoxy intumescent', 'Hydrocarbon', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, true, 'High-performance hydrocarbon protection'),
  ('PPG', 'Pitt-Char NX', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, false, 'Next-generation water-based intumescent')
ON CONFLICT DO NOTHING;

-- Insert Hempel products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_section_factor, notes)
VALUES
  ('Hempel', 'Hempacore One WB', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Single-coat water-based intumescent'),
  ('Hempel', 'Hempacore One FD', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Fast-drying water-based intumescent'),
  ('Hempel', 'Hempacore AQ', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Aqueous intumescent coating'),
  ('Hempel', 'Hempacore AQ 1200', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'High-build water-based intumescent up to 120 minutes')
ON CONFLICT DO NOTHING;

-- Insert Sika products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_section_factor, notes)
VALUES
  ('Sika', 'Unitherm Steel W', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Water-based steel protection'),
  ('Sika', 'Unitherm Steel S', 'Intumescent', 'Solvent-based', 'Cellulosic', 'ThinFilm_Solvent', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Solvent-based steel protection'),
  ('Sika', 'Unitherm Platinum', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Premium water-based intumescent system')
ON CONFLICT DO NOTHING;

-- Insert Nullifire products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_section_factor, notes)
VALUES
  ('Nullifire', 'SC601', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Single-coat water-based intumescent'),
  ('Nullifire', 'SC902', 'Intumescent', 'Solvent-based', 'Cellulosic', 'ThinFilm_Solvent', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Solvent-based thin-film coating')
ON CONFLICT DO NOTHING;

-- Insert AkzoNobel International products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_section_factor, notes)
VALUES
  ('AkzoNobel International', 'Interchar 1120', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Water-based thin-film intumescent'),
  ('AkzoNobel International', 'Interchar 1260', 'Intumescent', 'Epoxy intumescent', 'Hydrocarbon', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, 'Epoxy-based hydrocarbon protection')
ON CONFLICT DO NOTHING;

-- Insert Jotun products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_section_factor, notes)
VALUES
  ('Jotun', 'SteelMaster 600WF', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Water-based 60-minute protection'),
  ('Jotun', 'SteelMaster 900WF', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Water-based 90-minute protection'),
  ('Jotun', 'SteelMaster 1200WF', 'Intumescent', 'Water-based acrylic', 'Cellulosic', 'ThinFilm_Waterborne', 'microns', 5, 35, 85, 3, 'DFT_Gauge', true, 'Water-based 120-minute protection'),
  ('Jotun', 'SteelMaster 1200HPE', 'Intumescent', 'Epoxy intumescent', 'Hydrocarbon', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, 'High-performance epoxy hydrocarbon system')
ON CONFLICT DO NOTHING;

-- Insert Carboline products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_section_factor, notes)
VALUES
  ('Carboline', 'A/D Firefilm III', 'Intumescent', 'Epoxy intumescent', 'Cellulosic', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, 'Epoxy intumescent for structural steel'),
  ('Carboline', 'Thermo-Lag 3000-SP', 'Cementitious', 'Cement-based spray', 'Cellulosic', 'Cementitious_Spray', 'mm', 0, 40, 95, 3, 'DepthPinGauge', false, 'Spray-applied cementitious fireproofing'),
  ('Carboline', 'Thermo-Lag 3000-P', 'Cementitious', 'Cement-based spray', 'Hydrocarbon', 'Cementitious_Spray', 'mm', 0, 40, 95, 3, 'DepthPinGauge', false, 'Hydrocarbon-rated cementitious spray'),
  ('Carboline', 'E100 S', 'Intumescent', 'Epoxy intumescent', 'Hydrocarbon', 'Epoxy_Intumescent', 'microns', 5, 40, 80, 3, 'DFT_Gauge', true, 'Solvent-free epoxy intumescent for hydrocarbon')
ON CONFLICT DO NOTHING;

-- Insert Isolatek products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_density_test, notes)
VALUES
  ('Isolatek', 'CAFCO 300', 'Cementitious', 'Cement-based spray', 'Cellulosic', 'Cementitious_Spray', 'mm', 0, 40, 95, 3, 'DepthPinGauge', true, 'Lightweight cementitious spray fireproofing'),
  ('Isolatek', 'Fendolite MII', 'Cementitious', 'Cement-based spray', 'Cellulosic', 'Cementitious_Spray', 'mm', 0, 40, 95, 3, 'DepthPinGauge', true, 'Dense cementitious spray protection'),
  ('Isolatek', 'Blaze-Shield II', 'Board', 'Board system', 'Cellulosic', 'Board_System', 'mm', -20, 50, 95, 3, 'BoardCaliper', false, 'Fire-rated board encasement system')
ON CONFLICT DO NOTHING;

-- Insert Promat products
INSERT INTO materials (manufacturer, product_name, material_type, chemistry, fire_scenario, application_category, thickness_unit, min_temp_c, max_temp_c, max_rh_percent, min_dew_point_spread_c, default_measurement_method, requires_density_test, notes)
VALUES
  ('Promat', 'PROMASPRAY P300', 'Cementitious', 'Cement-based spray', 'Cellulosic', 'Cementitious_Spray', 'mm', 0, 40, 95, 3, 'DepthPinGauge', true, 'Lightweight spray-applied fireproofing'),
  ('Promat', 'PROMASPRAY P500', 'Cementitious', 'Cement-based spray', 'Hydrocarbon', 'Cementitious_Spray', 'mm', 0, 40, 95, 3, 'DepthPinGauge', true, 'Hydrocarbon-rated spray fireproofing'),
  ('Promat', 'PROMATECT-H', 'Board', 'Board system', 'Hydrocarbon', 'Board_System', 'mm', -20, 50, 95, 3, 'BoardCaliper', false, 'High-density board for hydrocarbon fire'),
  ('Promat', 'PROMATECT-L', 'Board', 'Board system', 'Cellulosic', 'Board_System', 'mm', -20, 50, 95, 3, 'BoardCaliper', false, 'Standard-density board protection')
ON CONFLICT DO NOTHING;
