import { useState } from 'react';
import { X, ExternalLink, FileText, User, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PhotoUpload } from '../PhotoUpload';

interface Pin {
  id: string;
  drawing_id: string;
  project_id: string;
  block_id: string;
  level_id: string;
  member_id: string | null;
  inspection_id: string | null;
  x: number;
  y: number;
  label: string;
  pin_number?: string;
  steel_type?: string;
  pin_type: 'inspection' | 'member' | 'ncr' | 'note';
  status: 'not_started' | 'in_progress' | 'pass' | 'repair_required';
  created_at: string;
}

interface PinDetailModalProps {
  isOpen: boolean;
  pin: Pin;
  projectId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function PinDetailModal({ isOpen, pin, projectId, onClose, onUpdate }: PinDetailModalProps) {
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);

  const handleUpdateStatus = async (newStatus: Pin['status']) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('drawing_pins')
        .update({ status: newStatus })
        .eq('id', pin.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating pin status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateInspection = () => {
    navigate(`/projects/${projectId}?tab=inspections&createFromPin=${pin.id}`);
    onClose();
  };

  const handleCreateNCR = () => {
    navigate(`/projects/${projectId}?tab=ncrs&createFromPin=${pin.id}`);
    onClose();
  };

  const handleOpenInspection = () => {
    if (pin.inspection_id) {
      navigate(`/projects/${projectId}?tab=inspections&inspection=${pin.inspection_id}`);
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'repair_required':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'in_progress':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'not_started':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inspection':
        return <FileText className="w-5 h-5" />;
      case 'member':
        return <User className="w-5 h-5" />;
      case 'ncr':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-700 my-8 max-h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {getTypeIcon(pin.pin_type)}
            <h2 className="text-xl font-bold text-white">Pin Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            {pin.pin_number && (
              <div className="mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Pin Number</span>
                <p className="text-xl font-bold text-primary-400">{pin.pin_number}</p>
              </div>
            )}
            {pin.steel_type && (
              <div className="mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Steel Type</span>
                <p className="text-md font-semibold text-white">{pin.steel_type}</p>
              </div>
            )}
            <h3 className="text-lg font-semibold text-white">{pin.label}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded font-medium uppercase">
                {pin.pin_type}
              </span>
              <span
                className={`text-xs px-2 py-1 border rounded font-medium ${getStatusColor(
                  pin.status
                )}`}
              >
                {pin.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Update Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateStatus('not_started')}
                disabled={updating || pin.status === 'not_started'}
                className="px-3 py-2 text-sm border-2 border-blue-600 text-blue-300 rounded-lg hover:bg-blue-900/30 disabled:opacity-50"
              >
                Not Started
              </button>
              <button
                onClick={() => handleUpdateStatus('in_progress')}
                disabled={updating || pin.status === 'in_progress'}
                className="px-3 py-2 text-sm border-2 border-orange-600 text-orange-300 rounded-lg hover:bg-orange-900/30 disabled:opacity-50"
              >
                In Progress
              </button>
              <button
                onClick={() => handleUpdateStatus('pass')}
                disabled={updating || pin.status === 'pass'}
                className="px-3 py-2 text-sm border-2 border-green-600 text-green-300 rounded-lg hover:bg-green-900/30 disabled:opacity-50"
              >
                Pass
              </button>
              <button
                onClick={() => handleUpdateStatus('repair_required')}
                disabled={updating || pin.status === 'repair_required'}
                className="px-3 py-2 text-sm border-2 border-red-600 text-red-300 rounded-lg hover:bg-red-900/30 disabled:opacity-50"
              >
                Repair Required
              </button>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Actions</h4>
            <div className="space-y-2">
              {pin.inspection_id ? (
                <button
                  onClick={handleOpenInspection}
                  className="w-full flex items-center justify-between px-4 py-2 bg-primary-900/30 text-primary-300 border border-primary-600 rounded-lg hover:bg-primary-900/50"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Open Linked Inspection
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreateInspection}
                  className="w-full flex items-center justify-between px-4 py-2 bg-slate-700 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-600"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Create Inspection
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleCreateNCR}
                className="w-full flex items-center justify-between px-4 py-2 bg-slate-700 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-600"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Create NCR
                </span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Photos</h4>
            <PhotoUpload pinId={pin.id} projectId={projectId} onPhotoAdded={onUpdate} />
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Position</h4>
            <p className="text-sm text-slate-300">
              X: {(pin.x * 100).toFixed(2)}%, Y: {(pin.y * 100).toFixed(2)}%
            </p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Created</h4>
            <p className="text-sm text-slate-300">
              {new Date(pin.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700 flex justify-end bg-slate-800">
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
