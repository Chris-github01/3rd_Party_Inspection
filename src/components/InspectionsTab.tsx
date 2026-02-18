import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, ClipboardCheck, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { InspectionStatusManager } from './InspectionStatusManager';
import { SimulationModePanel } from './SimulationModePanel';
import { MemberDataViewer } from './MemberDataViewer';

interface Inspection {
  id: string;
  inspection_date_time: string;
  location_label: string;
  level: string;
  block: string;
  appearance: string;
  result: string;
  inspection_status: string;
  approved_at: string;
  approved_by_user_id: string;
  approval_notes: string;
  member_id: string;
  members: {
    member_mark: string;
  };
}

interface PendingPin {
  id: string;
  label: string;
  pin_number: string | null;
  pin_type: string;
  status: string;
  block_name: string | null;
  level_name: string | null;
  member_mark: string | null;
}

export function InspectionsTab({ projectId }: { projectId: string }) {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [pendingPins, setPendingPins] = useState<PendingPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [pinId, setPinId] = useState<string | null>(null);

  useEffect(() => {
    loadInspections();
    loadPendingPins();
  }, [projectId]);

  useEffect(() => {
    const createFromPin = searchParams.get('createFromPin');
    if (createFromPin) {
      setPinId(createFromPin);
      setShowCreateModal(true);
      searchParams.delete('createFromPin');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const loadInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          members(member_mark),
          user_profiles!inspections_approved_by_user_id_fkey(name)
        `)
        .eq('project_id', projectId)
        .order('inspection_date_time', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPins = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_pins')
        .select(`
          id,
          label,
          pin_number,
          pin_type,
          status,
          blocks(name),
          levels(name),
          members(member_mark)
        `)
        .eq('project_id', projectId)
        .is('inspection_id', null)
        .in('pin_type', ['inspection', 'member']);

      if (error) throw error;

      const formatted = (data || []).map(pin => ({
        id: pin.id,
        label: pin.label,
        pin_number: pin.pin_number,
        pin_type: pin.pin_type,
        status: pin.status,
        block_name: pin.blocks?.name || null,
        level_name: pin.levels?.name || null,
        member_mark: pin.members?.member_mark || null,
      }));

      setPendingPins(formatted);
    } catch (error) {
      console.error('Error loading pending pins:', error);
    }
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pass':
        return 'bg-green-500/20 text-green-200';
      case 'fail':
        return 'bg-red-500/20 text-red-200';
      case 'repair':
        return 'bg-yellow-500/20 text-yellow-200';
      default:
        return 'bg-white/10 text-blue-200';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading inspections...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-400 bg-green-500/20';
      case 'repair_required':
        return 'text-red-400 bg-red-500/20';
      case 'in_progress':
        return 'text-orange-400 bg-orange-500/20';
      case 'not_started':
        return 'text-blue-400 bg-blue-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Inspection
        </button>
      )}

      {pendingPins.length > 0 && (
        <div className="bg-orange-500/10 backdrop-blur-sm rounded-lg border border-orange-500/30">
          <div className="px-6 py-4 border-b border-orange-500/30">
            <h3 className="text-lg font-semibold text-orange-200 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Pending Inspection Pins ({pendingPins.length})
            </h3>
            <p className="text-sm text-orange-300 mt-1">
              These pins in Site Manager need inspections created
            </p>
          </div>
          <div className="divide-y divide-orange-500/20">
            {pendingPins.map((pin) => (
              <div key={pin.id} className="px-6 py-4 hover:bg-orange-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-white">
                        {pin.pin_number ? `Pin ${pin.pin_number}` : pin.label}
                      </h4>
                      {pin.member_mark && (
                        <span className="text-sm text-blue-300">
                          {pin.member_mark}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(pin.status)}`}>
                        {pin.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded uppercase">
                        {pin.pin_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-blue-100 mt-1">
                      {pin.block_name && <span>Block: {pin.block_name}</span>}
                      {pin.level_name && <span>Level: {pin.level_name}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPinId(pin.id);
                      setShowCreateModal(true);
                    }}
                    className="ml-4 flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <Plus className="w-4 h-4" />
                    Create Inspection
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Completed Inspections</h3>
        </div>

        {inspections.length === 0 ? (
          <div className="text-center py-12 text-blue-200">No inspections recorded yet</div>
        ) : (
          <div className="divide-y divide-white/10">
            {inspections.map((inspection) => (
              <div key={inspection.id} className="px-6 py-4 hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <ClipboardCheck className="w-8 h-8 text-blue-600 mr-3" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-white">
                          {inspection.members.member_mark}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getResultColor(
                            inspection.result
                          )}`}
                        >
                          {inspection.result?.toUpperCase()}
                        </span>
                        {inspection.inspection_status && inspection.inspection_status !== 'Draft' && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            inspection.inspection_status === 'Passed' ? 'bg-green-500/20 text-green-200' :
                            inspection.inspection_status === 'Passed_With_Observations' ? 'bg-blue-500/20 text-blue-200' :
                            inspection.inspection_status === 'Failed' ? 'bg-red-500/20 text-red-200' :
                            'bg-amber-500/20 text-amber-200'
                          }`}>
                            {inspection.inspection_status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-blue-100 mt-1">
                        {inspection.location_label && <span>{inspection.location_label}</span>}
                        {inspection.block && <span>Block {inspection.block}</span>}
                        {inspection.level && <span>Level {inspection.level}</span>}
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(inspection.inspection_date_time), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedInspection(inspection)}
                    className="ml-4 flex items-center gap-2 px-3 py-2 text-sm text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateInspectionModal
          projectId={projectId}
          pinId={pinId}
          onClose={() => {
            setShowCreateModal(false);
            setPinId(null);
          }}
          onCreated={() => {
            setShowCreateModal(false);
            setPinId(null);
            loadInspections();
            loadPendingPins();
          }}
        />
      )}

      {selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Inspection: {selectedInspection.members.member_mark}
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  {format(new Date(selectedInspection.inspection_date_time), 'MMMM d, yyyy HH:mm')}
                </p>
              </div>
              <button
                onClick={() => setSelectedInspection(null)}
                className="text-blue-200 hover:text-blue-100"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <InspectionStatusManager
                inspection={selectedInspection}
                onStatusChanged={() => {
                  loadInspections();
                  setSelectedInspection(null);
                }}
              />

              <SimulationModePanel
                inspectionId={selectedInspection.id}
                onDataGenerated={() => {}}
              />

              <MemberDataViewer inspectionId={selectedInspection.id} />

              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Inspection Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-100">Location:</span>
                    <span className="ml-2 font-medium text-white">
                      {selectedInspection.location_label || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-100">Block:</span>
                    <span className="ml-2 font-medium text-white">
                      {selectedInspection.block || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-100">Level:</span>
                    <span className="ml-2 font-medium text-white">
                      {selectedInspection.level || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-100">Appearance:</span>
                    <span className="ml-2 font-medium text-white">
                      {selectedInspection.appearance || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-100">Result:</span>
                    <span className={`ml-2 font-medium ${
                      selectedInspection.result === 'pass' ? 'text-green-200' :
                      selectedInspection.result === 'fail' ? 'text-red-200' :
                      'text-amber-200'
                    }`}>
                      {selectedInspection.result?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateInspectionModal({
  projectId,
  pinId,
  onClose,
  onCreated,
}: {
  projectId: string;
  pinId?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [pinData, setPinData] = useState<any>(null);
  const [formData, setFormData] = useState({
    location_label: '',
    level: '',
    block: '',
    appearance: 'conform',
    result: 'pass',
    comments: '',
    ambient_temp_c: '',
    steel_temp_c: '',
    relative_humidity_pct: '',
    dew_point_c: '',
    instrument: 'Thermometer',
    instrument_serial: '',
    profile_min_um: '',
    profile_max_um: '',
    profile_avg_um: '',
    surface_method: 'replica tape',
    product_name: '',
    batch_number: '',
    dft_batch_number: '',
    gauge_serial: '',
    calibration_due_date: '',
  });
  const [dftReadings, setDftReadings] = useState<{ value: string; face: string }[]>([
    { value: '', face: 'web' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMembers();
    if (pinId) {
      loadPinData();
    }
  }, [pinId]);

  const loadPinData = async () => {
    if (!pinId) return;

    try {
      const { data, error } = await supabase
        .from('drawing_pins')
        .select(`
          *,
          blocks(name),
          levels(name)
        `)
        .eq('id', pinId)
        .single();

      if (error) throw error;

      if (data) {
        setPinData(data);

        if (data.member_id) {
          setSelectedMember(data.member_id);
        }

        setFormData(prev => ({
          ...prev,
          location_label: data.label || '',
          block: data.blocks?.name || '',
          level: data.levels?.name || '',
          result: data.status === 'pass' ? 'pass' : data.status === 'repair_required' ? 'repair' : 'pass',
        }));
      }
    } catch (error) {
      console.error('Error loading pin data:', error);
    }
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('project_id', projectId)
      .order('member_mark');
    setMembers(data || []);
  };

  const calculateDewPointSpread = () => {
    const steelTemp = parseFloat(formData.steel_temp_c);
    const dewPoint = parseFloat(formData.dew_point_c);
    if (!isNaN(steelTemp) && !isNaN(dewPoint)) {
      return steelTemp - dewPoint;
    }
    return 0;
  };

  const calculateDFTStats = () => {
    const values = dftReadings
      .map((r) => parseFloat(r.value))
      .filter((v) => !isNaN(v) && v > 0);

    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);

    return { min, max, avg, stddev, count: values.length };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Please select a member');
      return;
    }

    setLoading(true);
    try {
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          project_id: projectId,
          member_id: selectedMember,
          inspector_user_id: user?.id,
          location_label: formData.location_label,
          level: formData.level,
          block: formData.block,
          appearance: formData.appearance,
          result: formData.result,
          comments: formData.comments,
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      const dewPointSpread = calculateDewPointSpread();
      await supabase.from('env_readings').insert({
        inspection_id: inspection.id,
        ambient_temp_c: parseFloat(formData.ambient_temp_c) || null,
        steel_temp_c: parseFloat(formData.steel_temp_c) || null,
        relative_humidity_pct: parseFloat(formData.relative_humidity_pct) || null,
        dew_point_c: parseFloat(formData.dew_point_c) || null,
        dew_point_spread_c: dewPointSpread,
        conforms: dewPointSpread >= 3,
        instrument: formData.instrument,
        instrument_serial: formData.instrument_serial,
      });

      await supabase.from('surface_prep_checks').insert({
        inspection_id: inspection.id,
        profile_min_um: parseInt(formData.profile_min_um) || null,
        profile_max_um: parseInt(formData.profile_max_um) || null,
        profile_avg_um: parseInt(formData.profile_avg_um) || null,
        method: formData.surface_method,
        conforms: true,
      });

      await supabase.from('material_checks').insert({
        inspection_id: inspection.id,
        product_name: formData.product_name,
        batch_number: formData.batch_number,
      });

      const dftStats = calculateDFTStats();
      if (dftStats) {
        const { data: batch, error: batchError } = await supabase
          .from('dft_batches')
          .insert({
            inspection_id: inspection.id,
            dft_batch_number: formData.dft_batch_number,
            gauge_serial: formData.gauge_serial,
            calibration_due_date: formData.calibration_due_date || null,
            dft_min_microns: dftStats.min,
            dft_max_microns: dftStats.max,
            dft_avg_microns: dftStats.avg,
            dft_stddev: dftStats.stddev,
            readings_count: dftStats.count,
          })
          .select()
          .single();

        if (!batchError && batch) {
          const readingsToInsert = dftReadings
            .filter((r) => r.value && !isNaN(parseFloat(r.value)))
            .map((r, idx) => ({
              dft_batch_id: batch.id,
              reading_no: idx + 1,
              value_microns: parseInt(r.value),
              face: r.face,
            }));

          await supabase.from('dft_readings').insert(readingsToInsert);
        }
      }

      const member = members.find((m) => m.id === selectedMember);
      if (member?.required_dft_microns && dftStats) {
        const newStatus = dftStats.avg >= member.required_dft_microns ? 'pass' : 'repair_required';
        await supabase.from('members').update({ status: newStatus }).eq('id', selectedMember);
      }

      if (pinId && inspection) {
        await supabase
          .from('drawing_pins')
          .update({
            inspection_id: inspection.id,
            status: formData.result === 'pass' ? 'pass' : formData.result === 'fail' ? 'repair_required' : 'repair_required'
          })
          .eq('id', pinId);
      }

      onCreated();
    } catch (error: any) {
      alert('Error creating inspection: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-800/95 backdrop-blur-md rounded-lg max-w-4xl w-full my-8 flex flex-col max-h-[calc(100vh-4rem)] border border-slate-700/50 shadow-2xl">
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Create Inspection</h2>
              {pinData && (
                <p className="text-sm text-slate-400 mt-1">
                  Creating inspection from pin: <span className="text-blue-400">{pinData.label}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Select Member *
              </label>
              <select
                required
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
              >
                <option value="" className="bg-slate-800">Choose a member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-800">
                    {m.member_mark} - {m.coating_system} ({m.required_dft_microns}µm required)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Location No.
                </label>
                <input
                  type="text"
                  value={formData.location_label}
                  onChange={(e) => setFormData({ ...formData, location_label: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400"
                  placeholder="Beam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Block</label>
                <input
                  type="text"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Level</label>
                <input
                  type="text"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                />
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="font-semibold text-white mb-3">Environmental Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Ambient Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.ambient_temp_c}
                    onChange={(e) => setFormData({ ...formData, ambient_temp_c: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Steel Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.steel_temp_c}
                    onChange={(e) => setFormData({ ...formData, steel_temp_c: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">RH (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.relative_humidity_pct}
                    onChange={(e) =>
                      setFormData({ ...formData, relative_humidity_pct: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Dew Point (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.dew_point_c}
                    onChange={(e) => setFormData({ ...formData, dew_point_c: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span
                  className={`font-medium ${
                    calculateDewPointSpread() >= 3 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  Dew Point Spread: {calculateDewPointSpread().toFixed(1)}°C{' '}
                  {calculateDewPointSpread() >= 3 ? '✓ Pass' : '✗ Fail'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="font-semibold text-white mb-3">DFT Readings</h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={formData.dft_batch_number}
                    onChange={(e) =>
                      setFormData({ ...formData, dft_batch_number: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-blue-200"
                    placeholder="1122"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Gauge Serial
                  </label>
                  <input
                    type="text"
                    value={formData.gauge_serial}
                    onChange={(e) => setFormData({ ...formData, gauge_serial: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {dftReadings.map((reading, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Value (µm)"
                      value={reading.value}
                      onChange={(e) => {
                        const newReadings = [...dftReadings];
                        newReadings[idx].value = e.target.value;
                        setDftReadings(newReadings);
                      }}
                      className="flex-1 px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400"
                    />
                    <select
                      value={reading.face}
                      onChange={(e) => {
                        const newReadings = [...dftReadings];
                        newReadings[idx].face = e.target.value;
                        setDftReadings(newReadings);
                      }}
                      className="px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                    >
                      <option value="web" className="bg-slate-800">Web</option>
                      <option value="flange1" className="bg-slate-800">Flange 1</option>
                      <option value="flange2" className="bg-slate-800">Flange 2</option>
                      <option value="other" className="bg-slate-800">Other</option>
                    </select>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDftReadings([...dftReadings, { value: '', face: 'web' }])}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Reading
                </button>
              </div>
              {calculateDFTStats() && (
                <div className="mt-3 p-3 bg-slate-700/80 rounded border border-slate-600">
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-blue-100">Min:</span>{' '}
                      <span className="font-medium text-white">{calculateDFTStats()!.min}µm</span>
                    </div>
                    <div>
                      <span className="text-blue-100">Max:</span>{' '}
                      <span className="font-medium text-white">{calculateDFTStats()!.max}µm</span>
                    </div>
                    <div>
                      <span className="text-blue-100">Avg:</span>{' '}
                      <span className="font-medium text-white">{calculateDFTStats()!.avg.toFixed(1)}µm</span>
                    </div>
                    <div>
                      <span className="text-blue-100">Std Dev:</span>{' '}
                      <span className="font-medium text-white">{calculateDFTStats()!.stddev.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="font-semibold text-white mb-3">Result</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Appearance
                  </label>
                  <select
                    value={formData.appearance}
                    onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                  >
                    <option value="conform" className="bg-slate-800">Conform</option>
                    <option value="nonconform" className="bg-slate-800">Non-Conform</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Result</label>
                  <select
                    value={formData.result}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                  >
                    <option value="pass" className="bg-slate-800">Pass</option>
                    <option value="fail" className="bg-slate-800">Fail</option>
                    <option value="repair" className="bg-slate-800">Repair Required</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white hover:bg-slate-700 rounded-lg transition-colors border border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Inspection'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}
