import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, Package, X, Upload, Download, Filter } from 'lucide-react';
import Papa from 'papaparse';

interface Material {
  id: string;
  manufacturer: string;
  product_name: string;
  product_code: string | null;
  material_type: string;
  fire_scenario: string | null;
  application_category: string;
  thickness_unit: string;
  min_temp_c: number | null;
  max_temp_c: number | null;
  max_rh_percent: number | null;
  min_dew_point_spread_c: number;
  max_fire_rating_minutes: number | null;
  certification_standard: string | null;
  approved_primer_systems: string[] | null;
  approved_topcoats: string[] | null;
  default_measurement_method: string;
  requires_section_factor: boolean;
  requires_density_test: boolean;
  requires_bond_test: boolean;
  external_use_allowed: boolean;
  interior_only: boolean;
  tds_url: string | null;
  sds_url: string | null;
  notes: string | null;
  active: boolean;
  chemistry: string | null;
  region_availability: string[] | null;
  spec_library_reference: string | null;
  created_at: string;
}

type TabFilter = 'all' | 'thin_film' | 'epoxy' | 'cementitious' | 'board' | 'primer' | 'topcoat';

const TABS = [
  { id: 'all' as TabFilter, label: 'All' },
  { id: 'thin_film' as TabFilter, label: 'Intumescent (Thin Film)' },
  { id: 'epoxy' as TabFilter, label: 'Epoxy Intumescent' },
  { id: 'cementitious' as TabFilter, label: 'Cementitious' },
  { id: 'board' as TabFilter, label: 'Board Systems' },
  { id: 'primer' as TabFilter, label: 'Primer' },
  { id: 'topcoat' as TabFilter, label: 'Topcoat' },
];

export function Materials() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    fireScenario: '',
    certificationStandard: '',
    thicknessUnit: '',
    externalUse: '',
    active: 'true',
  });

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('manufacturer, product_name');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
      await loadMaterials();
    } catch (error: any) {
      alert('Error deleting material: ' + error.message);
    }
  };

  const canManageTemplates = profile?.role === 'admin' || profile?.role === 'inspector';

  const getFilteredMaterials = () => {
    let filtered = materials;

    switch (activeTab) {
      case 'thin_film':
        filtered = filtered.filter(m =>
          ['ThinFilm_Waterborne', 'ThinFilm_Solvent', 'Hybrid'].includes(m.application_category)
        );
        break;
      case 'epoxy':
        filtered = filtered.filter(m => m.application_category === 'Epoxy_Intumescent');
        break;
      case 'cementitious':
        filtered = filtered.filter(m => m.application_category === 'Cementitious_Spray');
        break;
      case 'board':
        filtered = filtered.filter(m => m.application_category === 'Board_System');
        break;
      case 'primer':
        filtered = filtered.filter(m => m.material_type === 'Primer');
        break;
      case 'topcoat':
        filtered = filtered.filter(m => m.material_type === 'Topcoat');
        break;
    }

    if (filters.fireScenario) {
      filtered = filtered.filter(m => m.fire_scenario === filters.fireScenario);
    }
    if (filters.certificationStandard) {
      filtered = filtered.filter(m => m.certification_standard?.includes(filters.certificationStandard));
    }
    if (filters.thicknessUnit) {
      filtered = filtered.filter(m => m.thickness_unit === filters.thicknessUnit);
    }
    if (filters.externalUse) {
      filtered = filtered.filter(m => m.external_use_allowed === (filters.externalUse === 'true'));
    }
    if (filters.active) {
      filtered = filtered.filter(m => m.active === (filters.active === 'true'));
    }

    return filtered;
  };

  const filteredMaterials = getFilteredMaterials();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Fire Protection Material Registry</h1>
              <p className="text-blue-100 mt-1">Master library of fire protection coating materials and systems</p>
            </div>
          {canManageTemplates && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Upload className="w-5 h-5 mr-2" />
                Import CSV
              </button>
              <button
                onClick={() => {
                  setEditingMaterial(null);
                  setShowModal(true);
                }}
                className="flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Material
              </button>
            </div>
          )}
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {showFilters && <span className="text-xs text-blue-200">(Active)</span>}
          </button>

          {showFilters && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Fire Scenario</label>
                  <select
                    value={filters.fireScenario}
                    onChange={(e) => setFilters({ ...filters, fireScenario: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="Cellulosic">Cellulosic</option>
                    <option value="Hydrocarbon">Hydrocarbon</option>
                    <option value="Jet Fire">Jet Fire</option>
                    <option value="Tunnel">Tunnel</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Certification Standard</label>
                  <input
                    type="text"
                    placeholder="e.g., AS1530.4"
                    value={filters.certificationStandard}
                    onChange={(e) => setFilters({ ...filters, certificationStandard: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Thickness Unit</label>
                  <select
                    value={filters.thicknessUnit}
                    onChange={(e) => setFilters({ ...filters, thicknessUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="microns">Microns</option>
                    <option value="mm">mm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">External Use</label>
                  <select
                    value={filters.externalUse}
                    onChange={(e) => setFilters({ ...filters, externalUse: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Status</label>
                  <select
                    value={filters.active}
                    onChange={(e) => setFilters({ ...filters, active: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

          {filteredMaterials.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border-2 border-dashed border-white/10 p-12 text-center">
            <Package className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No materials found</h3>
            <p className="text-blue-100 mb-6">
              {materials.length === 0 ? 'Add materials to your library or import from CSV' : 'Try adjusting your filters'}
            </p>
            {canManageTemplates && materials.length === 0 && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Import CSV
                </button>
                <button
                  onClick={() => {
                    setEditingMaterial(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Material
                </button>
              </div>
            )}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 backdrop-blur-sm border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Manufacturer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Product Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Application</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Fire Scenario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Thickness Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Temp Range</th>
                    {canManageTemplates && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-sm text-white">{material.manufacturer}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{material.product_name}</div>
                        {material.chemistry && (
                          <div className="text-xs text-blue-200">{material.chemistry}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-300 rounded">
                          {material.material_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-blue-100">
                        {material.application_category.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4">
                        {material.fire_scenario && (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-300 rounded">
                            {material.fire_scenario}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-100">{material.thickness_unit}</td>
                      <td className="px-6 py-4 text-sm text-blue-100">
                        {material.min_temp_c}°C - {material.max_temp_c}°C
                      </td>
                      {canManageTemplates && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingMaterial(material);
                                setShowModal(true);
                              }}
                              className="p-1 text-primary-300 hover:bg-white/5 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="p-1 text-red-300 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}

          <div className="mt-6 text-sm text-blue-200 text-center">
            Showing {filteredMaterials.length} of {materials.length} materials | Prepared by P&R Consulting Limited
          </div>
        </div>
      </div>

      {showModal && (
        <MaterialModal
          material={editingMaterial}
          onClose={() => {
            setShowModal(false);
            setEditingMaterial(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingMaterial(null);
            loadMaterials();
          }}
        />
      )}

      {showImportModal && (
        <CSVImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            loadMaterials();
          }}
        />
      )}
    </div>
  );
}

function MaterialModal({
  material,
  onClose,
  onSaved,
}: {
  material: Material | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    manufacturer: material?.manufacturer || '',
    product_name: material?.product_name || '',
    product_code: material?.product_code || '',
    material_type: material?.material_type || 'Intumescent',
    fire_scenario: material?.fire_scenario || 'Cellulosic',
    application_category: material?.application_category || 'ThinFilm_Waterborne',
    thickness_unit: material?.thickness_unit || 'microns',
    min_temp_c: material?.min_temp_c || 5,
    max_temp_c: material?.max_temp_c || 35,
    max_rh_percent: material?.max_rh_percent || 85,
    min_dew_point_spread_c: material?.min_dew_point_spread_c || 3,
    max_fire_rating_minutes: material?.max_fire_rating_minutes || null,
    certification_standard: material?.certification_standard || '',
    default_measurement_method: material?.default_measurement_method || 'DFT_Gauge',
    requires_section_factor: material?.requires_section_factor || false,
    requires_density_test: material?.requires_density_test || false,
    requires_bond_test: material?.requires_bond_test || false,
    external_use_allowed: material?.external_use_allowed || false,
    interior_only: material?.interior_only || false,
    tds_url: material?.tds_url || '',
    sds_url: material?.sds_url || '',
    chemistry: material?.chemistry || '',
    notes: material?.notes || '',
    active: material?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        ...formData,
        product_code: formData.product_code || null,
        max_fire_rating_minutes: formData.max_fire_rating_minutes || null,
        certification_standard: formData.certification_standard || null,
        tds_url: formData.tds_url || null,
        sds_url: formData.sds_url || null,
        chemistry: formData.chemistry || null,
        notes: formData.notes || null,
      };

      if (material) {
        const { error } = await supabase
          .from('materials')
          .update(data)
          .eq('id', material.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert(data);
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const isIntumescent = ['ThinFilm_Waterborne', 'ThinFilm_Solvent', 'Hybrid', 'Epoxy_Intumescent'].includes(formData.application_category);
  const isCementitious = formData.application_category === 'Cementitious_Spray';
  const isBoard = formData.application_category === 'Board_System';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/5 backdrop-blur-sm rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-white/5 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white">
            {material ? 'Edit Material' : 'Add Material'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="font-semibold text-white mb-3">Core Identity</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Product Code</label>
                  <input
                    type="text"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                    className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-white/10 pb-4">
              <h3 className="font-semibold text-white mb-3">Classification</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Material Type *</label>
                  <select
                    value={formData.material_type}
                    onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Primer">Primer</option>
                    <option value="Intumescent">Intumescent</option>
                    <option value="Cementitious">Cementitious</option>
                    <option value="Board">Board</option>
                    <option value="Topcoat">Topcoat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fire Scenario</label>
                  <select
                    value={formData.fire_scenario}
                    onChange={(e) => setFormData({ ...formData, fire_scenario: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Cellulosic">Cellulosic</option>
                    <option value="Hydrocarbon">Hydrocarbon</option>
                    <option value="Jet Fire">Jet Fire</option>
                    <option value="Tunnel">Tunnel</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Application Category *</label>
                  <select
                    value={formData.application_category}
                    onChange={(e) => setFormData({ ...formData, application_category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ThinFilm_Waterborne">Thin Film - Waterborne</option>
                    <option value="ThinFilm_Solvent">Thin Film - Solvent</option>
                    <option value="Epoxy_Intumescent">Epoxy Intumescent</option>
                    <option value="Cementitious_Spray">Cementitious Spray</option>
                    <option value="Board_System">Board System</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-900 mb-3">Technical Properties</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thickness Unit *</label>
                  <select
                    value={formData.thickness_unit}
                    onChange={(e) => setFormData({ ...formData, thickness_unit: e.target.value })}
                    disabled={isCementitious || isBoard}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100"
                  >
                    <option value="microns">Microns</option>
                    <option value="mm">mm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Measurement Method *</label>
                  <select
                    value={formData.default_measurement_method}
                    onChange={(e) => setFormData({ ...formData, default_measurement_method: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="DFT_Gauge">DFT Gauge</option>
                    <option value="WetFilmGauge">Wet Film Gauge</option>
                    <option value="DepthPinGauge">Depth Pin Gauge</option>
                    <option value="BoardCaliper">Board Caliper</option>
                    <option value="DensityCoreTest">Density Core Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.min_temp_c || ''}
                    onChange={(e) => setFormData({ ...formData, min_temp_c: parseFloat(e.target.value) || null })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.max_temp_c || ''}
                    onChange={(e) => setFormData({ ...formData, max_temp_c: parseFloat(e.target.value) || null })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max RH (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.max_rh_percent || ''}
                    onChange={(e) => setFormData({ ...formData, max_rh_percent: parseFloat(e.target.value) || null })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Dew Point Spread (°C) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.min_dew_point_spread_c}
                    onChange={(e) => setFormData({ ...formData, min_dew_point_spread_c: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-900 mb-3">Specification</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Fire Rating (minutes)</label>
                  <input
                    type="number"
                    value={formData.max_fire_rating_minutes || ''}
                    onChange={(e) => setFormData({ ...formData, max_fire_rating_minutes: parseInt(e.target.value) || null })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Certification Standard</label>
                  <input
                    type="text"
                    placeholder="e.g., AS1530.4, EN13381, UL263"
                    value={formData.certification_standard}
                    onChange={(e) => setFormData({ ...formData, certification_standard: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chemistry</label>
                  <input
                    type="text"
                    placeholder="e.g., Water-based acrylic"
                    value={formData.chemistry}
                    onChange={(e) => setFormData({ ...formData, chemistry: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-900 mb-3">Inspection Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                {isIntumescent && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requires_section_factor}
                      onChange={(e) => setFormData({ ...formData, requires_section_factor: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Requires Section Factor (Hp/A)</span>
                  </label>
                )}
                {isCementitious && (
                  <>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_density_test}
                        onChange={(e) => setFormData({ ...formData, requires_density_test: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Requires Density Test</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_bond_test}
                        onChange={(e) => setFormData({ ...formData, requires_bond_test: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Requires Bond Test</span>
                    </label>
                  </>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.external_use_allowed}
                    onChange={(e) => setFormData({ ...formData, external_use_allowed: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">External Use Allowed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.interior_only}
                    onChange={(e) => setFormData({ ...formData, interior_only: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Interior Only</span>
                </label>
              </div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-900 mb-3">Documentation</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TDS URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.tds_url}
                    onChange={(e) => setFormData({ ...formData, tds_url: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SDS URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.sds_url}
                    onChange={(e) => setFormData({ ...formData, sds_url: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : material ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CSVImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCSVData] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCSVData(results.data);
        setPreview(results.data.slice(0, 10));
      },
      error: (err: any) => {
        setError('Error parsing CSV: ' + err.message);
      },
    });
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      const materials = csvData.map((row: any) => ({
        manufacturer: row.manufacturer?.trim(),
        product_name: row.product_name?.trim(),
        material_type: row.type || 'Intumescent',
        chemistry: row.chemistry || null,
        fire_scenario: row.fire_type || 'Cellulosic',
        application_category: row.application_type || 'ThinFilm_Waterborne',
        thickness_unit: row.thickness_unit || 'microns',
        min_temp_c: parseFloat(row.temp_min_c) || null,
        max_temp_c: parseFloat(row.temp_max_c) || null,
        max_rh_percent: parseFloat(row.max_rh_pct) || null,
        min_dew_point_spread_c: parseFloat(row.dew_point_spread_min_c) || 3,
        default_measurement_method: row.thickness_unit === 'mm' ? 'DepthPinGauge' : 'DFT_Gauge',
        requires_section_factor: row.application_type?.includes('Intumescent') || false,
        requires_density_test: row.application_type === 'Cementitious_Spray' || false,
        requires_bond_test: row.application_type === 'Cementitious_Spray' || false,
        external_use_allowed: false,
        interior_only: false,
        notes: row.notes || null,
        active: true,
      }));

      const { error } = await supabase.from('materials').insert(materials);

      if (error) {
        if (error.code === '23505') {
          setError('Some materials already exist. Duplicates were skipped.');
        } else {
          throw error;
        }
      }

      onImported();
    } catch (err: any) {
      setError('Error importing: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Import Materials from CSV</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload CSV File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="text-xs text-slate-500 mt-2">
              Required columns: manufacturer, product_name, type, chemistry, fire_type, application_type, thickness_unit, temp_min_c, temp_max_c, max_rh_pct, dew_point_spread_min_c, notes
            </p>
          </div>

          {preview.length > 0 && (
            <>
              <h3 className="font-semibold text-slate-900 mb-3">Preview ({preview.length} of {csvData.length} rows)</h3>
              <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-2">Manufacturer</th>
                      <th className="text-left py-2 px-2">Product</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Application</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-slate-200">
                        <td className="py-2 px-2">{row.manufacturer}</td>
                        <td className="py-2 px-2">{row.product_name}</td>
                        <td className="py-2 px-2">{row.type}</td>
                        <td className="py-2 px-2">{row.application_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || csvData.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : `Import ${csvData.length} Materials`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
