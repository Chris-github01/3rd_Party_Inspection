import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface NCR {
  id: string;
  ncr_number: number;
  issue_type: string;
  severity: string;
  description: string;
  corrective_action_required: string;
  status: string;
  created_at: string;
  members: {
    member_mark: string;
  } | null;
}

export function NCRsTab({ projectId }: { projectId: string }) {
  const { profile } = useAuth();
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadNCRs();
  }, [projectId]);

  const loadNCRs = async () => {
    try {
      const { data, error } = await supabase
        .from('ncrs')
        .select('*, members(member_mark)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNcrs(data || []);
    } catch (error) {
      console.error('Error loading NCRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'major':
        return 'bg-orange-100 text-orange-700';
      case 'minor':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'ready_for_reinspect':
        return 'bg-blue-100 text-blue-700';
      case 'closed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredNCRs = filterStatus === 'all' ? ncrs : ncrs.filter((n) => n.status === filterStatus);

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  if (loading) {
    return <div className="text-center py-8">Loading NCRs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create NCR
          </button>
        )}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All NCRs</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="ready_for_reinspect">Ready for Reinspect</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Non-Conformance Reports ({filteredNCRs.length})
          </h3>
        </div>

        {filteredNCRs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No NCRs found</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredNCRs.map((ncr) => (
              <div key={ncr.id} className="px-6 py-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <AlertTriangle className="w-8 h-8 text-red-600 mr-3 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900">NCR-{ncr.ncr_number}</h4>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(
                            ncr.severity
                          )}`}
                        >
                          {ncr.severity?.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                            ncr.status
                          )}`}
                        >
                          {ncr.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {ncr.members && (
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Member:</span> {ncr.members.member_mark}
                          </p>
                        )}
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Issue:</span>{' '}
                          {ncr.issue_type?.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-slate-900">{ncr.description}</p>
                        {ncr.corrective_action_required && (
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Action Required:</span>{' '}
                            {ncr.corrective_action_required}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          Created {format(new Date(ncr.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateNCRModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadNCRs();
          }}
        />
      )}
    </div>
  );
}

function CreateNCRModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [members, setMembers] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    member_id: '',
    inspection_id: '',
    issue_type: 'low_dft',
    severity: 'minor',
    description: '',
    corrective_action_required: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .eq('project_id', projectId)
      .order('member_mark');

    const { data: inspectionsData } = await supabase
      .from('inspections')
      .select('*, members(member_mark)')
      .eq('project_id', projectId)
      .order('inspection_date_time', { ascending: false });

    setMembers(membersData || []);
    setInspections(inspectionsData || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: maxNCR } = await supabase
        .from('ncrs')
        .select('ncr_number')
        .eq('project_id', projectId)
        .order('ncr_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNCRNumber = (maxNCR?.ncr_number || 0) + 1;

      const { error } = await supabase.from('ncrs').insert({
        project_id: projectId,
        member_id: formData.member_id || null,
        inspection_id: formData.inspection_id || null,
        ncr_number: nextNCRNumber,
        issue_type: formData.issue_type,
        severity: formData.severity,
        description: formData.description,
        corrective_action_required: formData.corrective_action_required,
        status: 'open',
      });

      if (error) throw error;

      if (formData.member_id) {
        await supabase
          .from('members')
          .update({ status: 'repair_required' })
          .eq('id', formData.member_id);
      }

      onCreated();
    } catch (error: any) {
      alert('Error creating NCR: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Create Non-Conformance Report</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Member</label>
              <select
                value={formData.member_id}
                onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Select member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.member_mark}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Related Inspection
              </label>
              <select
                value={formData.inspection_id}
                onChange={(e) => setFormData({ ...formData, inspection_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Select inspection (optional)...</option>
                {inspections.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.members.member_mark} - {format(new Date(i.inspection_date_time), 'MMM d')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Issue Type *
                </label>
                <select
                  required
                  value={formData.issue_type}
                  onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="low_dft">Low DFT</option>
                  <option value="damage">Damage</option>
                  <option value="delamination">Delamination</option>
                  <option value="missing_area">Missing Area</option>
                  <option value="wrong_system">Wrong System</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Severity *</label>
                <select
                  required
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                placeholder="Describe the non-conformance..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Corrective Action Required
              </label>
              <textarea
                value={formData.corrective_action_required}
                onChange={(e) =>
                  setFormData({ ...formData, corrective_action_required: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                placeholder="Describe required corrective actions..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create NCR'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
