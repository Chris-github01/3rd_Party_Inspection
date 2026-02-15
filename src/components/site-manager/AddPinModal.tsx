import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddPinModalProps {
  isOpen: boolean;
  drawingId: string;
  levelId: string;
  projectId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPinModal({
  isOpen,
  drawingId,
  levelId,
  projectId,
  position,
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
  const [selectedInspectionId, setSelectedInspectionId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId, levelId]);

  const loadData = async () => {
    try {
      const { data: levelData } = await supabase
        .from('levels')
        .select('block_id')
        .eq('id', levelId)
        .single();

      if (levelData) {
        setBlockId(levelData.block_id);
      }

      const [membersResult, inspectionsResult] = await Promise.all([
        supabase
          .from('members')
          .select('*')
          .eq('project_id', projectId)
          .order('member_mark'),
        supabase
          .from('inspections')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      ]);

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

    if (!blockId) {
      setError('Block ID not found');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('drawing_pins').insert([
        {
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
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Add Pin</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Door Frame A1, Wall Penetration"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={creating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pin Type <span className="text-red-500">*</span>
            </label>
            <select
              value={pinType}
              onChange={(e) => setPinType(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={creating}
            >
              <option value="inspection">Inspection</option>
              <option value="member">Member</option>
              <option value="ncr">NCR</option>
              <option value="note">General Note</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Link to Member (optional)
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={creating}
              >
                <option value="">-- Select Member --</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.member_mark} - {member.element_type || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {pinType === 'inspection' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Link to Inspection (optional)
              </label>
              <select
                value={selectedInspectionId}
                onChange={(e) => setSelectedInspectionId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-600">
              <span className="font-medium">Position:</span> X: {(position.x * 100).toFixed(1)}%,
              Y: {(position.y * 100).toFixed(1)}%
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={creating || !label.trim()}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Pin'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
