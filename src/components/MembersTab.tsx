import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Upload, Edit, Trash2, Download } from 'lucide-react';
import Papa from 'papaparse';

interface Member {
  id: string;
  member_mark: string;
  element_type: string;
  section: string;
  level: string;
  block: string;
  frr_minutes: number;
  coating_system: string;
  required_dft_microns: number;
  required_thickness_mm: number;
  status: string;
  notes: string;
}

const ELEMENT_TYPES = ['beam', 'column', 'brace', 'other'];
const COATING_SYSTEMS = ['SC601', 'SC902', 'Pyrocrete40', 'Other'];
const STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'bg-white/10 text-blue-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-300' },
  { value: 'pass', label: 'Pass', color: 'bg-green-500/20 text-green-300' },
  { value: 'repair_required', label: 'Repair Required', color: 'bg-red-500/20 text-red-300' },
  { value: 'closed', label: 'Closed', color: 'bg-primary-500/20 text-primary-300' },
];

export function MembersTab({ projectId }: { projectId: string }) {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('project_id', projectId)
        .order('member_mark');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const membersData = results.data
            .filter((row: any) => row.member_mark)
            .map((row: any) => ({
              project_id: projectId,
              member_mark: row.member_mark || '',
              element_type: row.element_type || 'beam',
              section: row.section || '',
              level: row.level || '',
              block: row.block || '',
              frr_minutes: parseInt(row.frr_minutes) || 0,
              coating_system: row.coating_system || '',
              required_dft_microns: parseInt(row.required_dft_microns) || null,
              required_thickness_mm: parseFloat(row.required_thickness_mm) || null,
              status: 'not_started',
              notes: row.notes || '',
            }));

          const { error } = await supabase.from('members').insert(membersData);

          if (error) throw error;
          await loadMembers();
          alert(`Successfully imported ${membersData.length} members`);
        } catch (error: any) {
          alert('Error importing CSV: ' + error.message);
        }
        e.target.value = '';
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message);
        e.target.value = '';
      },
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;

    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      await loadMembers();
    } catch (error: any) {
      alert('Error deleting member: ' + error.message);
    }
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(members);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members.csv';
    a.click();
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  if (loading) {
    return <div className="text-center py-8">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingMember(null);
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Member
          </button>
          <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
            <Upload className="w-5 h-5 mr-2" />
            Import CSV
            <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          </label>
          {members.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          )}
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center py-12 text-blue-200">
            No members in register. Add members or import from CSV.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10 backdrop-blur-sm border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    Member Mark
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    Section
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    Block
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    FRR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    System
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    Req. DFT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">
                    Status
                  </th>
                  {canEdit && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-blue-200 uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {members.map((member) => {
                  const status = STATUSES.find((s) => s.value === member.status);
                  return (
                    <tr key={member.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {member.member_mark}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-100 capitalize">
                        {member.element_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-100">{member.section}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">{member.level}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">{member.block}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">
                        {member.frr_minutes} min
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-100">{member.coating_system}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">
                        {member.required_dft_microns ? `${member.required_dft_microns} µm` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${status?.color}`}
                        >
                          {status?.label}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingMember(member);
                                setShowModal(true);
                              }}
                              className="p-1 text-primary-400 hover:bg-white/10 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <MemberModal
          projectId={projectId}
          member={editingMember}
          onClose={() => {
            setShowModal(false);
            setEditingMember(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingMember(null);
            loadMembers();
          }}
        />
      )}
    </div>
  );
}

function MemberModal({
  projectId,
  member,
  onClose,
  onSaved,
}: {
  projectId: string;
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    member_mark: member?.member_mark || '',
    element_type: member?.element_type || 'beam',
    section: member?.section || '',
    level: member?.level || '',
    block: member?.block || '',
    frr_minutes: member?.frr_minutes || 0,
    coating_system: member?.coating_system || 'SC601',
    required_dft_microns: member?.required_dft_microns || 0,
    required_thickness_mm: member?.required_thickness_mm || 0,
    notes: member?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (member) {
        const { error } = await supabase
          .from('members')
          .update(formData)
          .eq('id', member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('members').insert({
          ...formData,
          project_id: projectId,
        });
        if (error) throw error;
      }
      onSaved();
    } catch (error: any) {
      alert('Error saving member: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            {member ? 'Edit Member' : 'Add Member'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Member Mark *
                </label>
                <input
                  type="text"
                  required
                  value={formData.member_mark}
                  onChange={(e) => setFormData({ ...formData, member_mark: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-slate-400"
                  placeholder="B734"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Element Type *
                </label>
                <select
                  value={formData.element_type}
                  onChange={(e) => setFormData({ ...formData, element_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {ELEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Section</label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-slate-400"
                  placeholder="610UB125"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
                <input
                  type="text"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-slate-400"
                  placeholder="L2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Block</label>
                <input
                  type="text"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-slate-400"
                  placeholder="B"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  FRR (minutes)
                </label>
                <input
                  type="number"
                  value={formData.frr_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, frr_minutes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Coating System
                </label>
                <select
                  value={formData.coating_system}
                  onChange={(e) => setFormData({ ...formData, coating_system: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {COATING_SYSTEMS.map((system) => (
                    <option key={system} value={system}>
                      {system}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Required DFT (µm)
                </label>
                <input
                  type="number"
                  value={formData.required_dft_microns}
                  onChange={(e) =>
                    setFormData({ ...formData, required_dft_microns: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-white hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : member ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
