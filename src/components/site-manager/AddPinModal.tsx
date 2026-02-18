import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddPinModalProps {
  isOpen: boolean;
  drawingId: string;
  levelId: string;
  projectId: string;
  position: { x: number; y: number };
  pageNumber?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPinModal({
  isOpen,
  drawingId,
  levelId,
  projectId,
  position,
  pageNumber = 1,
  onClose,
  onSuccess,
}: AddPinModalProps) {
  const [label, setLabel] = useState('');
  const [pinType, setPinType] = useState<'inspection' | 'member' | 'ncr' | 'note'>('inspection');
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'pass' | 'repair_required'>(
    'not_started'
  );
  const [members, setMembers] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId, levelId, drawingId]);

  useEffect(() => {
    if (selectedMemberId && members.length > 0) {
      const member = members.find((m) => m.member_id === selectedMemberId);
      setSelectedMember(member || null);
    } else {
      setSelectedMember(null);
    }
  }, [selectedMemberId, members]);

  const loadData = async () => {
    try {
      const [levelData, drawingData, membersResult, inspectionsResult] = await Promise.all([
        supabase
          .from('levels')
          .select('block_id')
          .eq('id', levelId)
          .single(),
        supabase
          .from('drawings')
          .select('document_id')
          .eq('id', drawingId)
          .single(),
        supabase.rpc('get_project_members_for_dropdown', { p_project_id: projectId }),
        supabase
          .from('inspections')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      ]);

      if (levelData.data) {
        setBlockId(levelData.data.block_id);
      }

      if (drawingData.data) {
        setDocumentId(drawingData.data.document_id);
      }

      if (membersResult.data) setMembers(membersResult.data);
      if (inspectionsResult.data) setInspections(inspectionsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label is required');
      return;
    }

    if ((pinType === 'inspection' || pinType === 'member') && !selectedMemberId) {
      setError('Member selection is required for inspection and member pins');
      return;
    }

    if (!blockId) {
      setError('Block ID not found');
      return;
    }

    if (!documentId) {
      setError('Document ID not found');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('drawing_pins').insert([
        {
          document_id: documentId,
          drawing_id: drawingId,
          project_id: projectId,
          block_id: blockId,
          level_id: levelId,
          x: position.x,
          y: position.y,
          label: label.trim(),
          pin_type: pinType,
          status,
          member_id: selectedMemberId || null,
          inspection_id: selectedInspectionId || null,
          page_number: pageNumber,
        },
      ]);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      console.error('Error creating pin:', err);
      setError(err.message || 'Failed to create pin');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full my-8 flex flex-col max-h-[calc(100vh-4rem)] border border-slate-700">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Add Pin</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Door Frame A1, Wall Penetration"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
              disabled={creating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pin Type <span className="text-red-500">*</span>
            </label>
            <select
              value={pinType}
              onChange={(e) => setPinType(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={creating}
            >
              <option value="inspection">Inspection</option>
              <option value="member">Member</option>
              <option value="ncr">NCR</option>
              <option value="note">General Note</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={creating}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="pass">Pass</option>
              <option value="repair_required">Repair Required</option>
            </select>
          </div>

          {(pinType === 'member' || pinType === 'inspection') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Member <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={creating}
              >
                <option value="">-- Select Member --</option>
                {members.map((member) => (
                  <option key={member.member_id} value={member.member_id}>
                    {member.member_mark || 'No Mark'} - {member.section_size || 'Unknown'}
                    {member.loading_schedule_ref && ` (${member.loading_schedule_ref})`}
                  </option>
                ))}
              </select>
              {members.length === 0 && (
                <p className="text-xs text-yellow-400 mt-1">
                  No members found. Please upload a loading schedule or add members manually.
                </p>
              )}
            </div>
          )}

          {selectedMember && (pinType === 'member' || pinType === 'inspection') && (
            <div className="bg-primary-900/30 border border-primary-700/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-primary-300 mb-2">Member Details</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Section:</span>
                  <span className="text-white ml-2">{selectedMember.section_size || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Type:</span>
                  <span className="text-white ml-2">{selectedMember.element_type || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">FRR:</span>
                  <span className="text-white ml-2">{selectedMember.frr_format || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Required DFT:</span>
                  <span className="text-white ml-2">
                    {selectedMember.dft_required_microns ? `${selectedMember.dft_required_microns} µm` : 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Product:</span>
                  <span className="text-white ml-2">{selectedMember.coating_product || 'N/A'}</span>
                </div>
                {selectedMember.loading_schedule_ref && (
                  <div className="col-span-2">
                    <span className="text-slate-400">Schedule Ref:</span>
                    <span className="text-white ml-2">{selectedMember.loading_schedule_ref}</span>
                  </div>
                )}
                {selectedMember.source && (
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      selectedMember.source === 'schedule'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {selectedMember.source === 'schedule' ? 'From Loading Schedule' : 'Manual Entry'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {pinType === 'inspection' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Link to Inspection (optional)
              </label>
              <select
                value={selectedInspectionId}
                onChange={(e) => setSelectedInspectionId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={creating}
              >
                <option value="">-- Select Inspection --</option>
                {inspections.map((inspection) => (
                  <option key={inspection.id} value={inspection.id}>
                    Inspection {inspection.id.slice(0, 8)} -{' '}
                    {new Date(inspection.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
            <p className="text-xs text-slate-300">
              <span className="font-medium">Position:</span> X: {(position.x * 100).toFixed(1)}%,
              Y: {(position.y * 100).toFixed(1)}%
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={creating || !label.trim()}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? 'Creating...' : 'Create Pin'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
      </div>
    </div>
  );
}
