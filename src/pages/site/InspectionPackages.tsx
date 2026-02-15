import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Star, Package, X } from 'lucide-react';

interface InspectionPackage {
  id: string;
  name: string;
  material_id: string;
  fire_scenario: string;
  frr_minutes: number;
  required_thickness_unit: string;
  required_thickness_value: number;
  section_factor_required: boolean;
  notes: string;
  is_default: boolean;
  materials?: {
    manufacturer: string;
    product_name: string;
  };
}

interface Material {
  id: string;
  manufacturer: string;
  product_name: string;
  thickness_unit: string;
}

export function InspectionPackages() {
  const { projectId } = useParams<{ projectId: string }>();
  const [packages, setPackages] = useState<InspectionPackage[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<InspectionPackage | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    material_id: '',
    fire_scenario: 'Cellulosic',
    frr_minutes: 120,
    required_thickness_unit: 'microns',
    required_thickness_value: 0,
    section_factor_required: false,
    notes: '',
    is_default: false,
  });

  useEffect(() => {
    loadPackages();
    loadMaterials();
  }, [projectId]);

  const loadPackages = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('inspection_packages')
      .select('*, materials(manufacturer, product_name)')
      .eq('project_id', projectId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading packages:', error);
      return;
    }

    setPackages(data || []);
    setLoading(false);
  };

  const loadMaterials = async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('id, manufacturer, product_name, thickness_unit')
      .eq('active', true)
      .order('manufacturer');

    if (error) {
      console.error('Error loading materials:', error);
      return;
    }

    setMaterials(data || []);
  };

  const handleCreate = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      material_id: '',
      fire_scenario: 'Cellulosic',
      frr_minutes: 120,
      required_thickness_unit: 'microns',
      required_thickness_value: 0,
      section_factor_required: false,
      notes: '',
      is_default: false,
    });
    setShowModal(true);
  };

  const handleEdit = (pkg: InspectionPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      material_id: pkg.material_id,
      fire_scenario: pkg.fire_scenario,
      frr_minutes: pkg.frr_minutes,
      required_thickness_unit: pkg.required_thickness_unit,
      required_thickness_value: pkg.required_thickness_value,
      section_factor_required: pkg.section_factor_required,
      notes: pkg.notes || '',
      is_default: pkg.is_default,
    });
    setShowModal(true);
  };

  const handleMaterialChange = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setFormData({
        ...formData,
        material_id: materialId,
        required_thickness_unit: material.thickness_unit,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) return;

    if (editingPackage) {
      const { error } = await supabase
        .from('inspection_packages')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingPackage.id);

      if (error) {
        console.error('Error updating package:', error);
        alert('Failed to update package');
        return;
      }
    } else {
      const { error } = await supabase
        .from('inspection_packages')
        .insert({ ...formData, project_id: projectId });

      if (error) {
        console.error('Error creating package:', error);
        alert('Failed to create package');
        return;
      }
    }

    setShowModal(false);
    loadPackages();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inspection package?')) return;

    const { error } = await supabase.from('inspection_packages').delete().eq('id', id);

    if (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
      return;
    }

    loadPackages();
  };

  const handleSetDefault = async (id: string) => {
    if (!projectId) return;

    await supabase
      .from('inspection_packages')
      .update({ is_default: false })
      .eq('project_id', projectId);

    const { error } = await supabase
      .from('inspection_packages')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      console.error('Error setting default:', error);
      return;
    }

    loadPackages();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white/10 backdrop-blur-sm">
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Inspection Packages</h2>
          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">New Package</span>
          </button>
        </div>
        <p className="text-sm text-blue-100">
          Configure inspection packages with materials, fire ratings, and required thickness.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {packages.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No packages yet</h3>
            <p className="text-blue-100 mb-4">Create your first inspection package to get started</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Package</span>
            </button>
          </div>
        ) : (
          packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-white">{pkg.name}</h3>
                    {pkg.is_default && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded">
                        <Star className="w-3 h-3" />
                        <span>Default</span>
                      </span>
                    )}
                  </div>
                  {pkg.materials && (
                    <p className="text-sm text-blue-100">
                      {pkg.materials.manufacturer} {pkg.materials.product_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {!pkg.is_default && (
                    <button
                      onClick={() => handleSetDefault(pkg.id)}
                      className="p-2 hover:bg-white/5 rounded transition-colors"
                      title="Set as default"
                    >
                      <Star className="w-4 h-4 text-blue-300" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(pkg)}
                    className="p-2 hover:bg-white/5 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-blue-100" />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="p-2 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-300" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-200">Fire Scenario:</span>
                  <p className="font-medium text-white">{pkg.fire_scenario}</p>
                </div>
                <div>
                  <span className="text-blue-200">FRR:</span>
                  <p className="font-medium text-white">{pkg.frr_minutes} min</p>
                </div>
                <div>
                  <span className="text-blue-200">Required:</span>
                  <p className="font-medium text-white">
                    {pkg.required_thickness_value} {pkg.required_thickness_unit}
                  </p>
                </div>
                {pkg.section_factor_required && (
                  <div>
                    <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-1 rounded">
                      Section Factor Required
                    </span>
                  </div>
                )}
              </div>

              {pkg.notes && (
                <p className="text-sm text-blue-100 mt-3 pt-3 border-t border-white/10">
                  {pkg.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-semibold text-white">
                {editingPackage ? 'Edit Package' : 'New Package'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-blue-100" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white placeholder-blue-200"
                  placeholder="e.g., Columns 120min SC902"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Material *
                </label>
                <select
                  required
                  value={formData.material_id}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white"
                >
                  <option value="">Select material...</option>
                  {materials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.manufacturer} - {mat.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Fire Scenario *
                  </label>
                  <select
                    required
                    value={formData.fire_scenario}
                    onChange={(e) => setFormData({ ...formData, fire_scenario: e.target.value })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white"
                  >
                    <option value="Cellulosic">Cellulosic</option>
                    <option value="Hydrocarbon">Hydrocarbon</option>
                    <option value="Jet Fire">Jet Fire</option>
                    <option value="Tunnel">Tunnel</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    FRR (minutes) *
                  </label>
                  <select
                    required
                    value={formData.frr_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, frr_minutes: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white"
                  >
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="90">90</option>
                    <option value="120">120</option>
                    <option value="180">180</option>
                    <option value="240">240</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Required Thickness *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formData.required_thickness_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        required_thickness_value: parseFloat(e.target.value),
                      })
                    }
                    className="flex-1 px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white"
                    placeholder="0"
                  />
                  <select
                    value={formData.required_thickness_unit}
                    onChange={(e) =>
                      setFormData({ ...formData, required_thickness_unit: e.target.value })
                    }
                    className="px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white"
                  >
                    <option value="microns">µm</option>
                    <option value="mm">mm</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="section_factor"
                  checked={formData.section_factor_required}
                  onChange={(e) =>
                    setFormData({ ...formData, section_factor_required: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-white/10 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label htmlFor="section_factor" className="text-sm font-medium text-white">
                  Section factor required
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-white/10 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label htmlFor="is_default" className="text-sm font-medium text-white">
                  Set as default package
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white placeholder-blue-200"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {editingPackage ? 'Update' : 'Create'} Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
