import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Camera,
  Upload,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface PinInspection {
  id: string;
  pin_id: string;
  inspection_status: string;
  notes: string;
  drawing_pins: {
    member_name: string;
    package_id: string;
    inspection_packages: {
      name: string;
      frr_minutes: number;
      required_thickness_value: number;
      required_thickness_unit: string;
      materials: {
        manufacturer: string;
        product_name: string;
      };
    };
  };
}

interface Reading {
  id: string;
  reading_no: number;
  thickness_value: number;
}

interface EnvironmentReading {
  id: string;
  ambient_temp_c: number;
  steel_temp_c: number;
  rh_percent: number;
  dew_point_c: number;
  dew_point_spread_c: number;
}

interface Photo {
  id: string;
  storage_path: string;
  photo_type: string;
  caption: string;
}

export function PinInspection() {
  const { projectId, pinId, inspectionId } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<PinInspection | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentReading | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeTab, setActiveTab] = useState<'thickness' | 'environment' | 'photos' | 'notes'>('thickness');
  const [loading, setLoading] = useState(true);

  const [newReading, setNewReading] = useState('');
  const [notes, setNotes] = useState('');

  const [envForm, setEnvForm] = useState({
    ambient_temp_c: '',
    steel_temp_c: '',
    rh_percent: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInspection();
    loadReadings();
    loadEnvironment();
    loadPhotos();
  }, [inspectionId]);

  const loadInspection = async () => {
    if (!inspectionId) return;

    const { data, error } = await supabase
      .from('pin_inspections')
      .select(`
        *,
        drawing_pins(
          member_name,
          package_id,
          inspection_packages(
            name,
            frr_minutes,
            required_thickness_value,
            required_thickness_unit,
            materials(manufacturer, product_name)
          )
        )
      `)
      .eq('id', inspectionId)
      .maybeSingle();

    if (error) {
      console.error('Error loading inspection:', error);
      return;
    }

    setInspection(data);
    setNotes(data?.notes || '');
    setLoading(false);
  };

  const loadReadings = async () => {
    if (!inspectionId) return;

    const { data, error } = await supabase
      .from('pin_dft_readings')
      .select('*')
      .eq('pin_inspection_id', inspectionId)
      .order('reading_no');

    if (error) {
      console.error('Error loading readings:', error);
      return;
    }

    setReadings(data || []);
  };

  const loadEnvironment = async () => {
    if (!inspectionId) return;

    const { data, error } = await supabase
      .from('pin_environment_readings')
      .select('*')
      .eq('pin_inspection_id', inspectionId)
      .maybeSingle();

    if (error) {
      console.error('Error loading environment:', error);
      return;
    }

    if (data) {
      setEnvironment(data);
      setEnvForm({
        ambient_temp_c: data.ambient_temp_c?.toString() || '',
        steel_temp_c: data.steel_temp_c?.toString() || '',
        rh_percent: data.rh_percent?.toString() || '',
      });
    }
  };

  const loadPhotos = async () => {
    if (!inspectionId) return;

    const { data, error } = await supabase
      .from('pin_photos')
      .select('*')
      .eq('pin_inspection_id', inspectionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading photos:', error);
      return;
    }

    setPhotos(data || []);
  };

  const handleAddReading = async () => {
    if (!inspectionId || !newReading) return;

    const value = parseFloat(newReading);
    if (isNaN(value)) return;

    const nextReadingNo = readings.length > 0 ? Math.max(...readings.map((r) => r.reading_no)) + 1 : 1;

    const { error } = await supabase.from('pin_dft_readings').insert({
      pin_inspection_id: inspectionId,
      reading_no: nextReadingNo,
      thickness_value: value,
    });

    if (error) {
      console.error('Error adding reading:', error);
      return;
    }

    setNewReading('');
    loadReadings();
  };

  const handleDeleteReading = async (id: string) => {
    const { error } = await supabase.from('pin_dft_readings').delete().eq('id', id);

    if (error) {
      console.error('Error deleting reading:', error);
      return;
    }

    loadReadings();
  };

  const calculateDewPoint = (temp: number, rh: number): number => {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100);
    return (b * alpha) / (a - alpha);
  };

  const handleSaveEnvironment = async () => {
    if (!inspectionId) return;

    const ambient = parseFloat(envForm.ambient_temp_c);
    const steel = parseFloat(envForm.steel_temp_c);
    const rh = parseFloat(envForm.rh_percent);

    if (isNaN(ambient) || isNaN(steel) || isNaN(rh)) {
      alert('Please enter valid numbers');
      return;
    }

    const dewPoint = calculateDewPoint(ambient, rh);
    const dewPointSpread = steel - dewPoint;

    const envData = {
      pin_inspection_id: inspectionId,
      ambient_temp_c: ambient,
      steel_temp_c: steel,
      rh_percent: rh,
      dew_point_c: dewPoint,
      dew_point_spread_c: dewPointSpread,
      conforms: dewPointSpread >= 3,
    };

    if (environment) {
      const { error } = await supabase
        .from('pin_environment_readings')
        .update(envData)
        .eq('id', environment.id);

      if (error) {
        console.error('Error updating environment:', error);
        return;
      }
    } else {
      const { error } = await supabase.from('pin_environment_readings').insert(envData);

      if (error) {
        console.error('Error creating environment:', error);
        return;
      }
    }

    loadEnvironment();
    alert('Environment saved');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !inspectionId || !pinId || !projectId) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${projectId}/pins/${pinId}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      alert('Failed to upload photo');
      return;
    }

    const { error: insertError } = await supabase.from('pin_photos').insert({
      pin_inspection_id: inspectionId,
      pin_id: pinId,
      storage_path: filePath,
      photo_type: 'Other',
    });

    if (insertError) {
      console.error('Error saving photo:', insertError);
      alert('Failed to save photo');
      return;
    }

    loadPhotos();
  };

  const handleSaveDraft = async () => {
    if (!inspectionId) return;

    const { error } = await supabase
      .from('pin_inspections')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', inspectionId);

    if (error) {
      console.error('Error saving draft:', error);
      return;
    }

    alert('Draft saved');
  };

  const handleMarkStatus = async (status: 'Passed' | 'Failed' | 'Rectification_Required') => {
    if (!inspectionId || !pinId) return;

    const { error: inspectionError } = await supabase
      .from('pin_inspections')
      .update({
        inspection_status: status,
        completed_at: new Date().toISOString(),
        notes,
      })
      .eq('id', inspectionId);

    if (inspectionError) {
      console.error('Error updating inspection:', inspectionError);
      return;
    }

    let pinStatus = 'not_started';
    if (status === 'Passed') pinStatus = 'pass';
    else if (status === 'Failed') pinStatus = 'repair_required';
    else if (status === 'Rectification_Required') pinStatus = 'repair_required';

    const { error: pinError } = await supabase
      .from('drawing_pins')
      .update({ status: pinStatus })
      .eq('id', pinId);

    if (pinError) {
      console.error('Error updating pin:', pinError);
      return;
    }

    alert(`Inspection marked as ${status}`);
    navigate(`/projects/${projectId}/site/pins`);
  };

  const calculateStats = () => {
    if (readings.length === 0) return null;

    const values = readings.map((r) => r.thickness_value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const required = inspection?.drawing_pins?.inspection_packages?.required_thickness_value || 0;
    const passCount = values.filter((v) => v >= required).length;
    const passPercent = (passCount / values.length) * 100;

    return { count: values.length, avg, min, max, stdDev, passPercent, required };
  };

  const stats = calculateStats();

  if (loading || !inspection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pkg = inspection.drawing_pins?.inspection_packages;

  return (
    <div className="h-full flex flex-col bg-white/10 backdrop-blur-sm">
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 shadow-sm">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">
              {inspection.drawing_pins?.member_name || 'Inspection'}
            </h1>
            <p className="text-xs text-blue-100">{pkg?.name}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              inspection.inspection_status === 'Passed'
                ? 'bg-green-500/20 text-green-300'
                : inspection.inspection_status === 'Failed'
                ? 'bg-red-500/20 text-red-300'
                : 'bg-white/10 text-blue-100'
            }`}
          >
            {inspection.inspection_status}
          </span>
        </div>

        <div className="bg-white/10 backdrop-blur-sm px-4 py-3 border-t border-white/10 grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-blue-200 block text-xs">Material</span>
            <p className="font-medium text-white truncate">
              {pkg?.materials?.manufacturer}
            </p>
          </div>
          <div>
            <span className="text-blue-200 block text-xs">FRR</span>
            <p className="font-medium text-white">{pkg?.frr_minutes} min</p>
          </div>
          <div>
            <span className="text-blue-200 block text-xs">Required</span>
            <p className="font-medium text-white">
              {pkg?.required_thickness_value} {pkg?.required_thickness_unit}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="flex overflow-x-auto">
          <TabButton label="Thickness" active={activeTab === 'thickness'} onClick={() => setActiveTab('thickness')} />
          <TabButton label="Environment" active={activeTab === 'environment'} onClick={() => setActiveTab('environment')} />
          <TabButton label="Photos" active={activeTab === 'photos'} onClick={() => setActiveTab('photos')} count={photos.length} />
          <TabButton label="Notes" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'thickness' && (
          <div className="space-y-4">
            {stats && (
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-sm">
                <h3 className="font-semibold text-white mb-3">Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-200">Readings</span>
                    <p className="font-semibold text-white">{stats.count}</p>
                  </div>
                  <div>
                    <span className="text-blue-200">Average</span>
                    <p className="font-semibold text-white">{stats.avg.toFixed(1)} {pkg?.required_thickness_unit}</p>
                  </div>
                  <div>
                    <span className="text-blue-200">Min / Max</span>
                    <p className="font-semibold text-white">
                      {stats.min} / {stats.max} {pkg?.required_thickness_unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-200">Std Dev</span>
                    <p className="font-semibold text-white">{stats.stdDev.toFixed(1)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-blue-200">Compliance</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            stats.passPercent >= 100 ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${Math.min(stats.passPercent, 100)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-white">{stats.passPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-sm">
              <h3 className="font-semibold text-white mb-3">Add Reading</h3>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.1"
                  value={newReading}
                  onChange={(e) => setNewReading(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddReading();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white placeholder-blue-200"
                  placeholder="Enter value"
                />
                <button
                  onClick={handleAddReading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 shadow-sm">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold text-white">Readings ({readings.length})</h3>
              </div>
              <div className="divide-y divide-white/10">
                {readings.map((reading) => (
                  <div key={reading.id} className="flex items-center justify-between p-3 hover:bg-white/5">
                    <div>
                      <span className="text-sm font-medium text-white">
                        Reading #{reading.reading_no}
                      </span>
                      <p className="text-lg font-semibold text-white">
                        {reading.thickness_value} {pkg?.required_thickness_unit}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteReading(reading.id)}
                      className="p-2 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-300" />
                    </button>
                  </div>
                ))}
                {readings.length === 0 && (
                  <div className="p-8 text-center text-blue-200">
                    No readings yet. Add your first reading above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'environment' && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-sm">
              <h3 className="font-semibold text-white mb-4">Environmental Conditions</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Ambient Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={envForm.ambient_temp_c}
                    onChange={(e) => setEnvForm({ ...envForm, ambient_temp_c: e.target.value })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Steel Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={envForm.steel_temp_c}
                    onChange={(e) => setEnvForm({ ...envForm, steel_temp_c: e.target.value })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Relative Humidity (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={envForm.rh_percent}
                    onChange={(e) => setEnvForm({ ...envForm, rh_percent: e.target.value })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white"
                  />
                </div>
                <button
                  onClick={handleSaveEnvironment}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                  Calculate & Save
                </button>
              </div>
            </div>

            {environment && (
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-sm">
                <h3 className="font-semibold text-white mb-3">Calculated Values</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-100">Dew Point:</span>
                    <span className="font-medium text-white">
                      {environment.dew_point_c?.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100">Dew Point Spread:</span>
                    <span className="font-medium text-white">
                      {environment.dew_point_spread_c?.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-blue-100">Conforms:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        environment.conforms
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {environment.conforms ? 'Yes (≥3°C)' : 'No (<3°C)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Camera className="w-5 h-5" />
                <span className="font-medium">Take Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">Upload</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden shadow-sm">
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documents/${photo.storage_path}`}
                    alt={photo.caption || 'Photo'}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-2">
                    <span className="text-xs text-blue-100">{photo.photo_type}</span>
                  </div>
                </div>
              ))}
            </div>

            {photos.length === 0 && (
              <div className="text-center py-12 text-blue-200">
                <Camera className="w-16 h-16 text-blue-300 mx-auto mb-2" />
                <p>No photos yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-sm">
            <h3 className="font-semibold text-white mb-3">Inspection Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/5 backdrop-blur-sm text-white placeholder-blue-200"
              placeholder="Add any notes or observations..."
            />
          </div>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 p-4 space-y-2">
        <button
          onClick={handleSaveDraft}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors font-medium"
        >
          <Save className="w-5 h-5" />
          <span>Save Draft</span>
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleMarkStatus('Passed')}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Pass</span>
          </button>
          <button
            onClick={() => handleMarkStatus('Failed')}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <XCircle className="w-4 h-4" />
            <span>Fail</span>
          </button>
          <button
            onClick={() => handleMarkStatus('Rectification_Required')}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Rectify</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-primary-500 text-primary-300'
          : 'border-transparent text-blue-100 hover:text-white'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-2 py-0.5 bg-white/10 text-white rounded-full text-xs">
          {count}
        </span>
      )}
    </button>
  );
}
