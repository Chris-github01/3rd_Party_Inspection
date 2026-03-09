import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Upload, CreditCard as Edit, Trash2, Download, FlaskConical, Hash, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { normalizeFRRValue } from '../lib/frrUtils';
import { generateSimulatedReadings, calculateSummary, type MemberConfig } from '../lib/simulationUtils';
import { exportReadingsToFormattedExcel } from '../lib/excelExport';
import { sanitizeCSVValue, validateFRRMinutes, validateDFTMicrons, validateThicknessMM } from '../lib/securityUtils';
import { generateQuantityBasedReadings, saveGeneratedReadings, type QuantityReadingConfig } from '../lib/quantityReadingsGenerator';

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
  quantity: number;
  auto_generated_base_id: string | null;
  is_spot_check: boolean;
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
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showQuantityReadingsModal, setShowQuantityReadingsModal] = useState(false);

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
            .map((row: any) => {
              // Sanitize and validate all CSV inputs
              const frrMinutes = validateFRRMinutes(row.frr_minutes);
              const dftMicrons = validateDFTMicrons(row.required_dft_microns);
              const thicknessMM = validateThicknessMM(row.required_thickness_mm);

              return {
                project_id: projectId,
                member_mark: sanitizeCSVValue(row.member_mark || ''),
                element_type: sanitizeCSVValue(row.element_type || 'beam'),
                section: sanitizeCSVValue(row.section || ''),
                level: sanitizeCSVValue(row.level || ''),
                block: sanitizeCSVValue(row.block || ''),
                frr_minutes: frrMinutes !== null ? frrMinutes : 0,
                coating_system: sanitizeCSVValue(row.coating_system || ''),
                required_dft_microns: dftMicrons,
                required_thickness_mm: thicknessMM,
                status: 'not_started',
                notes: sanitizeCSVValue(row.notes || ''),
              };
            })
            .filter(member => member.member_mark.trim().length > 0);  // Remove empty rows

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

  const toggleSelectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m.id)));
    }
  };

  const toggleSelectMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const exportReadingsToExcel = async () => {
    try {
      const selectedMembersList = members.filter(m => selectedMembers.has(m.id));

      const allReadingsData: any[] = [];

      for (const member of selectedMembersList) {
        const { data: inspections } = await supabase
          .from('inspections')
          .select('*, inspection_member_sets(*)')
          .eq('project_id', projectId)
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (inspections && inspections.length > 0) {
          const inspection = inspections[0];
          const memberSets = inspection.inspection_member_sets || [];

          for (const memberSet of memberSets) {
            const { data: readings } = await supabase
              .from('inspection_member_readings')
              .select('*')
              .eq('member_set_id', memberSet.id)
              .order('reading_no');

            if (readings) {
              // Sort readings by reading_no to ensure sequential order 1-100
              const sortedReadings = readings.sort((a: any, b: any) => a.reading_no - b.reading_no);

              sortedReadings.forEach((reading: any, index: number) => {
                allReadingsData.push({
                  'Member Mark': member.member_mark,
                  'Element Type': member.element_type,
                  'Section': member.section,
                  'Level': member.level,
                  'Block': member.block,
                  'FRR (min)': member.frr_minutes,
                  'Coating System': member.coating_system,
                  'Required DFT (µm)': member.required_dft_microns,
                  'Reading Number': reading.reading_no, // Use the stored reading number (1-100)
                  'DFT Value (µm)': reading.dft_microns,
                  'Date': new Date(inspection.created_at).toLocaleDateString(),
                });
              });
            }
          }
        }
      }

      if (allReadingsData.length === 0) {
        alert('No readings found for selected members');
        return;
      }

      const filename = `Member_DFT_Readings_${new Date().toISOString().split('T')[0]}.xlsx`;
      exportReadingsToFormattedExcel(allReadingsData, filename);
    } catch (error: any) {
      console.error('Error exporting readings:', error);
      alert('Failed to export readings: ' + error.message);
    }
  };

  const exportReadingsToPDF = async () => {
    try {
      const { generateMemberReadingsPDF } = await import('../lib/pdfMemberReadings');
      const selectedMembersList = members.filter(m => selectedMembers.has(m.id));

      const membersWithReadings = [];

      for (const member of selectedMembersList) {
        const { data: inspections } = await supabase
          .from('inspections')
          .select('*, inspection_member_sets(*)')
          .eq('project_id', projectId)
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (inspections && inspections.length > 0) {
          const inspection = inspections[0];
          const memberSets = inspection.inspection_member_sets || [];

          for (const memberSet of memberSets) {
            const { data: readings } = await supabase
              .from('inspection_member_readings')
              .select('*')
              .eq('member_set_id', memberSet.id)
              .order('reading_no');

            if (readings) {
              // Sort readings to ensure sequential order 1-100
              const sortedReadings = readings.sort((a: any, b: any) => a.reading_no - b.reading_no);

              membersWithReadings.push({
                member,
                memberSet,
                readings: sortedReadings,
                inspectionDate: new Date(inspection.created_at),
              });
            }
          }
        }
      }

      if (membersWithReadings.length === 0) {
        alert('No readings found for selected members');
        return;
      }

      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      await generateMemberReadingsPDF(project, membersWithReadings);
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF: ' + error.message);
    }
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  if (loading) {
    return <div className="text-center py-8">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedMembers.size === 0) {
                alert('Please select at least one member by checking the checkbox next to it');
                return;
              }
              setShowQuantityReadingsModal(true);
            }}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            title={selectedMembers.size === 0 ? 'Select members first' : `Generate quantity-based readings for ${selectedMembers.size} member(s)`}
          >
            <Hash className="w-5 h-5 mr-2" />
            Generate Quantity Readings
          </button>
          <button
            onClick={() => {
              if (selectedMembers.size === 0) {
                alert('Please select at least one member by checking the checkbox next to it');
                return;
              }
              setShowGenerateModal(true);
            }}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            title={selectedMembers.size === 0 ? 'Select members first' : `Generate readings for ${selectedMembers.size} member(s)`}
          >
            <FlaskConical className="w-5 h-5 mr-2" />
            Generate Test Readings
          </button>
          <button
            onClick={() => {
              if (selectedMembers.size === 0) {
                alert('Please select at least one member by checking the checkbox next to it');
                return;
              }
              exportReadingsToExcel();
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            title={selectedMembers.size === 0 ? 'Select members first' : `Export formatted Excel with 100 readings for ${selectedMembers.size} member(s)`}
          >
            <Download className="w-5 h-5 mr-2" />
            Export Formatted Excel
          </button>
          <button
            onClick={() => {
              if (selectedMembers.size === 0) {
                alert('Please select at least one member by checking the checkbox next to it');
                return;
              }
              exportReadingsToPDF();
            }}
            className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            title={selectedMembers.size === 0 ? 'Select members first' : `Export readings for ${selectedMembers.size} member(s)`}
          >
            <Download className="w-5 h-5 mr-2" />
            Export to PDF
          </button>
          {selectedMembers.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-200">
              <span className="text-sm font-medium">
                {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedMembers(new Set())}
                className="text-xs text-blue-300 hover:text-blue-100 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

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
                  <th className="px-4 py-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={selectedMembers.size === members.length && members.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
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
                    Quantity
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
                  const isSelected = selectedMembers.has(member.id);
                  return (
                    <tr key={member.id} className={`hover:bg-white/5 ${isSelected ? 'bg-blue-500/10' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectMember(member.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
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
                        {normalizeFRRValue(member.frr_minutes)} min
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-100">{member.coating_system}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">
                        {member.required_dft_microns ? `${member.required_dft_microns} µm` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <input
                            type="number"
                            min="1"
                            value={member.quantity || 1}
                            onChange={async (e) => {
                              const newQuantity = parseInt(e.target.value) || 1;
                              try {
                                const { error } = await supabase
                                  .from('members')
                                  .update({ quantity: newQuantity })
                                  .eq('id', member.id);
                                if (error) throw error;
                                await loadMembers();
                              } catch (error: any) {
                                alert('Error updating quantity: ' + error.message);
                              }
                            }}
                            className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-blue-100">{member.quantity || 1}</span>
                        )}
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

      {showGenerateModal && (
        <GenerateReadingsModal
          projectId={projectId}
          selectedMembers={members.filter(m => selectedMembers.has(m.id))}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={() => {
            setShowGenerateModal(false);
            setSelectedMembers(new Set());
          }}
        />
      )}

      {showQuantityReadingsModal && (
        <GenerateQuantityReadingsModal
          projectId={projectId}
          selectedMembers={members.filter(m => selectedMembers.has(m.id))}
          onClose={() => setShowQuantityReadingsModal(false)}
          onGenerated={() => {
            setShowQuantityReadingsModal(false);
            setSelectedMembers(new Set());
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
    quantity: member?.quantity || 1,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full my-8 border border-slate-700 flex flex-col max-h-[calc(100vh-4rem)]">
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">
            {member ? 'Edit Member' : 'Add Member'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Number of instances"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Number of instances to create with auto-generated IDs
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-slate-400 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700 bg-slate-800/50">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : member ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function GenerateReadingsModal({
  projectId,
  selectedMembers,
  onClose,
  onGenerated,
}: {
  projectId: string;
  selectedMembers: Member[];
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [lowestValue, setLowestValue] = useState<number>(400);
  const [highestValue, setHighestValue] = useState<number>(550);
  const [readingsPerMember, setReadingsPerMember] = useState<number>(100);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const validateInputs = (): string[] => {
    const errs: string[] = [];

    if (isNaN(lowestValue) || lowestValue <= 0) {
      errs.push('Lowest Value must be a positive number');
    }
    if (isNaN(highestValue) || highestValue <= 0) {
      errs.push('Highest Value must be a positive number');
    }
    if (lowestValue >= highestValue) {
      errs.push('Lowest Value must be less than Highest Value');
    }
    if (isNaN(readingsPerMember) || readingsPerMember < 1) {
      errs.push('Readings per Member must be at least 1');
    }

    return errs;
  };

  const handleGenerate = async () => {
    const validationErrors = validateInputs();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setGenerating(true);

    try {
      for (const member of selectedMembers) {
        const { data: inspection, error: inspectionError } = await supabase
          .from('inspections')
          .insert({
            project_id: projectId,
            member_id: member.id,
            inspection_date: new Date().toISOString().split('T')[0],
            result: 'pass',
            notes: `Simulated test data generated for ${member.member_mark}`,
          })
          .select()
          .single();

        if (inspectionError) throw inspectionError;

        const config: MemberConfig = {
          memberName: member.member_mark,
          requiredThickness: member.required_dft_microns || 425,
          minValue: lowestValue,
          maxValue: highestValue,
          readingsPerMember,
        };

        const readings = generateSimulatedReadings(config);
        const summary = calculateSummary(member.member_mark, config, readings);

        const { data: memberSet, error: memberSetError } = await supabase
          .from('inspection_member_sets')
          .insert({
            inspection_id: inspection.id,
            member_name: member.member_mark,
            required_thickness_microns: member.required_dft_microns || 425,
            min_value_microns: lowestValue,
            max_value_microns: highestValue,
            readings_per_member: readingsPerMember,
            is_simulated: true,
            summary_json: summary,
          })
          .select()
          .single();

        if (memberSetError) throw memberSetError;

        const readingsToInsert = readings.map((r) => ({
          member_set_id: memberSet.id,
          reading_no: r.readingNo,
          dft_microns: r.dftMicrons,
        }));

        const { error: readingsError } = await supabase
          .from('inspection_member_readings')
          .insert(readingsToInsert);

        if (readingsError) throw readingsError;
      }

      alert(`Successfully generated and saved ${readingsPerMember} readings for ${selectedMembers.length} member(s). You can now export these readings using the Export buttons.`);
      onGenerated();
    } catch (error: any) {
      console.error('Error generating readings:', error);
      setErrors([`Failed to generate readings: ${error.message}`]);
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Generate Test Readings</h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure parameters to generate simulated DFT readings for {selectedMembers.length} selected member(s)
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FlaskConical className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                <strong>Simulation Mode for demonstration purposes only.</strong>
                <br />
                Generated values are not actual field measurements.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Lowest Value (µm) *
                </label>
                <input
                  type="number"
                  value={lowestValue}
                  onChange={(e) => setLowestValue(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Highest Value (µm) *
                </label>
                <input
                  type="number"
                  value={highestValue}
                  onChange={(e) => setHighestValue(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Readings per Member *
                </label>
                <input
                  type="number"
                  value={readingsPerMember}
                  onChange={(e) => setReadingsPerMember(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                  min="1"
                  step="1"
                />
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Selected Members:</h3>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <span
                    key={member.id}
                    className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-200 rounded-full text-sm"
                  >
                    {member.member_mark}
                    {member.required_dft_microns && (
                      <span className="ml-1 text-blue-300">
                        (Req: {member.required_dft_microns}µm)
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <ul className="list-disc list-inside text-sm text-red-200">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4" />
                Generate Readings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MemberReadingParams {
  lowestValue: number;
  highestValue: number;
  readingsCount: number;
}

function GenerateQuantityReadingsModal({
  projectId,
  selectedMembers,
  onClose,
  onGenerated,
}: {
  projectId: string;
  selectedMembers: Member[];
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<Map<string, any[]>>(new Map());
  const [viewingMember, setViewingMember] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Check if members have different DFT requirements
  const uniqueDftValues = new Set(selectedMembers.map(m => m.required_dft_microns));
  const hasMultipleDftValues = uniqueDftValues.size > 1;

  // Per-member parameters (used when members have different DFT values)
  const [memberParams, setMemberParams] = useState<Map<string, MemberReadingParams>>(
    new Map(
      selectedMembers.map(m => [
        m.id,
        { lowestValue: 400, highestValue: 550, readingsCount: 100 }
      ])
    )
  );

  // Global parameters (used when all members have same DFT)
  const [globalLowestValue, setGlobalLowestValue] = useState<number>(400);
  const [globalHighestValue, setGlobalHighestValue] = useState<number>(550);
  const [globalReadingsPerMember, setGlobalReadingsPerMember] = useState<number>(100);

  const updateMemberParam = (memberId: string, field: keyof MemberReadingParams, value: number) => {
    const newParams = new Map(memberParams);
    const current = newParams.get(memberId) || { lowestValue: 400, highestValue: 550, readingsCount: 100 };
    newParams.set(memberId, { ...current, [field]: value });
    setMemberParams(newParams);
  };

  const validateInputs = (): string[] => {
    const errs: string[] = [];

    if (hasMultipleDftValues) {
      // Validate each member's parameters
      for (const member of selectedMembers) {
        const params = memberParams.get(member.id);
        if (!params) continue;

        if (isNaN(params.lowestValue) || params.lowestValue <= 0) {
          errs.push(`${member.member_mark}: Lowest Value must be a positive number`);
        }
        if (isNaN(params.highestValue) || params.highestValue <= 0) {
          errs.push(`${member.member_mark}: Highest Value must be a positive number`);
        }
        if (params.lowestValue >= params.highestValue) {
          errs.push(`${member.member_mark}: Lowest Value must be less than Highest Value`);
        }
        if (isNaN(params.readingsCount) || params.readingsCount < 1) {
          errs.push(`${member.member_mark}: Readings count must be at least 1`);
        }
      }
    } else {
      // Validate global parameters
      if (isNaN(globalLowestValue) || globalLowestValue <= 0) {
        errs.push('Lowest Value must be a positive number');
      }
      if (isNaN(globalHighestValue) || globalHighestValue <= 0) {
        errs.push('Highest Value must be a positive number');
      }
      if (globalLowestValue >= globalHighestValue) {
        errs.push('Lowest Value must be less than Highest Value');
      }
      if (isNaN(globalReadingsPerMember) || globalReadingsPerMember < 1) {
        errs.push('Readings per Member must be at least 1');
      }
    }

    return errs;
  };

  const handleGenerate = async () => {
    const validationErrors = validateInputs();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setGenerating(true);
    const dataMap = new Map();

    try {
      for (const member of selectedMembers) {
        let lowestValue: number;
        let highestValue: number;
        let readingsCount: number;

        if (hasMultipleDftValues) {
          const params = memberParams.get(member.id)!;
          lowestValue = params.lowestValue;
          highestValue = params.highestValue;
          readingsCount = params.readingsCount;
        } else {
          lowestValue = globalLowestValue;
          highestValue = globalHighestValue;
          readingsCount = globalReadingsPerMember;
        }

        // Calculate total readings: member.quantity × readingsCount
        // member.quantity represents number of sets (e.g., 3 pieces)
        // readingsCount represents readings per set (e.g., 100)
        // Total = 3 × 100 = 300 readings
        const memberQuantity = member.quantity || 1;
        const totalReadings = memberQuantity * readingsCount;

        const config: QuantityReadingConfig = {
          memberId: member.id,
          memberMark: member.member_mark,
          projectId,
          quantity: totalReadings,
          requiredDftMicrons: member.required_dft_microns || 450,
          minValue: lowestValue,
          maxValue: highestValue,
          readingsPerSet: readingsCount, // Track readings per set for grouping
        };

        const readings = await generateQuantityBasedReadings(config);
        await saveGeneratedReadings(config, readings);
        dataMap.set(member.id, readings);
      }

      setGeneratedData(dataMap);
      const totalReadings = Array.from(dataMap.values()).reduce((sum, readings) => sum + readings.length, 0);

      // Calculate set information
      let setInfo = '';
      for (const member of selectedMembers) {
        const memberReadings = dataMap.get(member.id) || [];
        const memberQuantity = member.quantity || 1;
        if (memberQuantity > 1) {
          setInfo += `\n${member.member_mark}: ${memberQuantity} sets × ${readingsCount} readings = ${memberReadings.length} total`;
        }
      }

      alert(`Successfully generated readings for ${selectedMembers.length} member(s) with a total of ${totalReadings} individual test readings.${setInfo}`);
    } catch (error: any) {
      console.error('Error generating quantity readings:', error);
      alert('Failed to generate readings: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const totalReadings = Array.from(generatedData.values()).reduce((sum, readings) => sum + readings.length, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full my-8 border border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Generate Quantity-Based Test Readings</h2>
          <p className="text-sm text-slate-400 mt-1">
            Auto-generate sequential IDs and test readings based on member quantities
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                <strong>Simulation Mode for demonstration purposes only.</strong>
                <br />
                Generated values are not actual field measurements.
              </div>
            </div>
          </div>

          {generatedData.size === 0 && (
            <>
              {hasMultipleDftValues ? (
                <div className="mb-6">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                    <div className="text-sm text-blue-200">
                      <strong>Multiple DFT Requirements Detected</strong>
                      <br />
                      Members have different required DFT values. Configure parameters for each member individually.
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedMembers.map((member) => {
                      const params = memberParams.get(member.id) || { lowestValue: 400, highestValue: 550, readingsCount: 100 };
                      return (
                        <div key={member.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                          <div className="mb-3">
                            <h4 className="text-white font-semibold">{member.member_mark}</h4>
                            <p className="text-sm text-slate-400">
                              Section: {member.section} | Required DFT: {member.required_dft_microns} µm
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                Lowest Value (µm) *
                              </label>
                              <input
                                type="number"
                                value={params.lowestValue}
                                onChange={(e) => updateMemberParam(member.id, 'lowestValue', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="0"
                                step="1"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                Highest Value (µm) *
                              </label>
                              <input
                                type="number"
                                value={params.highestValue}
                                onChange={(e) => updateMemberParam(member.id, 'highestValue', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="0"
                                step="1"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                Readings per Member *
                              </label>
                              <input
                                type="number"
                                value={params.readingsCount}
                                onChange={(e) => updateMemberParam(member.id, 'readingsCount', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                                step="1"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Lowest Value (µm) *
                    </label>
                    <input
                      type="number"
                      value={globalLowestValue}
                      onChange={(e) => setGlobalLowestValue(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Highest Value (µm) *
                    </label>
                    <input
                      type="number"
                      value={globalHighestValue}
                      onChange={(e) => setGlobalHighestValue(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Readings per Member *
                    </label>
                    <input
                      type="number"
                      value={globalReadingsPerMember}
                      onChange={(e) => setGlobalReadingsPerMember(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      step="1"
                    />
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
                  <ul className="list-disc list-inside text-sm text-red-200">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Selected Members:</h3>
            <div className="bg-slate-700/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-600/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Member Mark</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Section</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Req. DFT</th>
                    {generatedData.size > 0 && (
                      <>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Readings Generated</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600/30">
                  {selectedMembers.map((member) => {
                    const memberReadings = generatedData.get(member.id);

                    return (
                      <tr key={member.id} className="hover:bg-slate-600/20">
                        <td className="px-4 py-3 text-sm font-medium text-white">{member.member_mark}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{member.section}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{member.required_dft_microns} µm</td>
                        {memberReadings && (
                          <>
                            <td className="px-4 py-3 text-sm text-center text-green-300 font-medium">
                              {memberReadings.length} readings
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setViewingMember(member.id)}
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                              >
                                View Details
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {generatedData.size > 0 && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <div className="text-sm text-green-200">
                  <strong>✓ Generation Complete!</strong>
                  <br />
                  Successfully generated {totalReadings} total readings across {generatedData.size} member(s).
                  <br />
                  <span className="text-xs text-green-300 mt-2 block">
                    All readings have been saved to the database and will appear in reports.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
          {generatedData.size > 0 ? (
            <button
              type="button"
              onClick={() => {
                onGenerated();
                onClose();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={generating}
                className="px-4 py-2 text-white hover:bg-slate-700 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4" />
                    Generate All Readings
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {viewingMember && (
        <ReadingsDetailModal
          member={selectedMembers.find(m => m.id === viewingMember)!}
          readings={generatedData.get(viewingMember) || []}
          onClose={() => setViewingMember(null)}
        />
      )}
    </div>
  );
}

function ReadingsDetailModal({
  member,
  readings,
  onClose,
}: {
  member: Member;
  readings: any[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]">
      <div className="bg-slate-800 rounded-lg max-w-5xl w-full border border-slate-700 max-h-[80vh] flex flex-col">
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Detailed Readings: {member.member_mark}</h2>
            <p className="text-sm text-slate-400">Section: {member.section} | Required DFT: {member.required_dft_microns} µm</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="bg-slate-700/50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-600/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Generated ID</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Reading 1</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Reading 2</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Reading 3</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Average</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Temp (°C)</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-300">Humidity (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600/30">
                {readings.map((reading) => (
                  <tr key={reading.generatedId} className="hover:bg-slate-600/20">
                    <td className="px-4 py-3 font-mono text-blue-300">{reading.generatedId}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{reading.dftReading1} µm</td>
                    <td className="px-4 py-3 text-center text-slate-300">{reading.dftReading2} µm</td>
                    <td className="px-4 py-3 text-center text-slate-300">{reading.dftReading3} µm</td>
                    <td className="px-4 py-3 text-center font-medium text-white">{reading.dftAverage} µm</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        reading.status === 'pass'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {reading.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{reading.temperatureC}°C</td>
                    <td className="px-4 py-3 text-center text-slate-300">{reading.humidityPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-200">
              <strong>Note:</strong> These readings represent full measurement checks. Each generated ID corresponds to a complete inspection with 3 DFT readings per location.
              Pins dropped on drawings indicate spot check locations for visual reference, while these detailed records provide comprehensive coverage.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700 bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

