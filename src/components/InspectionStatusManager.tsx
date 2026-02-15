import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, AlertCircle, XCircle, FileWarning, FileEdit, Shield } from 'lucide-react';

interface InspectionStatusManagerProps {
  inspection: any;
  onStatusChanged: () => void;
}

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft', icon: FileEdit, color: 'slate' },
  { value: 'Passed', label: 'Passed', icon: CheckCircle2, color: 'green' },
  { value: 'Passed_With_Observations', label: 'Passed With Observations', icon: Shield, color: 'blue' },
  { value: 'Failed', label: 'Failed', icon: XCircle, color: 'red' },
  { value: 'Rectification_Required', label: 'Rectification Required', icon: FileWarning, color: 'amber' },
];

export function InspectionStatusManager({ inspection, onStatusChanged }: InspectionStatusManagerProps) {
  const { user, profile } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(inspection.inspection_status || 'Draft');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  const handleStatusChange = (newStatus: string) => {
    if (!canEdit) return;

    setSelectedStatus(newStatus);

    if (newStatus === 'Passed' || newStatus === 'Passed_With_Observations') {
      setShowApprovalModal(true);
    } else {
      updateStatus(newStatus);
    }
  };

  const updateStatus = async (status: string, withApproval: boolean = false) => {
    setUpdating(true);
    try {
      const oldStatus = inspection.inspection_status || 'Draft';

      const updateData: any = {
        inspection_status: status,
      };

      if (withApproval) {
        updateData.approved_by_user_id = user?.id;
        updateData.approved_at = new Date().toISOString();
        updateData.approval_notes = approvalNotes || null;
      } else if (status === 'Draft') {
        updateData.approved_by_user_id = null;
        updateData.approved_at = null;
        updateData.approval_notes = null;
      }

      const { error } = await supabase
        .from('inspections')
        .update(updateData)
        .eq('id', inspection.id);

      if (error) throw error;

      await supabase.from('inspection_audit_log').insert({
        inspection_id: inspection.id,
        old_status: oldStatus,
        new_status: status,
        changed_by_user_id: user?.id,
        notes: approvalNotes || null,
      });

      onStatusChanged();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Failed to update status: ' + error.message);
    } finally {
      setUpdating(false);
      setShowApprovalModal(false);
      setApprovalNotes('');
    }
  };

  const getStatusColor = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option?.color || 'slate';
  };

  const currentStatus = STATUS_OPTIONS.find(o => o.value === selectedStatus);
  const StatusIcon = currentStatus?.icon || FileEdit;

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Inspection Outcome</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={!canEdit || updating}
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-10
                  ${getStatusColor(selectedStatus) === 'green' ? 'border-green-500 bg-green-50' : ''}
                  ${getStatusColor(selectedStatus) === 'blue' ? 'border-blue-500 bg-blue-50' : ''}
                  ${getStatusColor(selectedStatus) === 'red' ? 'border-red-500 bg-red-50' : ''}
                  ${getStatusColor(selectedStatus) === 'amber' ? 'border-amber-500 bg-amber-50' : ''}
                `}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <StatusIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none
                text-${getStatusColor(selectedStatus)}-600
              `} />
            </div>
          </div>

          {inspection.approved_at && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-slate-700">Approved</span>
              </div>
              <div className="text-sm text-slate-600 space-y-1 ml-6">
                <p>
                  <span className="font-medium">Date:</span>{' '}
                  {new Date(inspection.approved_at).toLocaleDateString('en-NZ', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p>
                  <span className="font-medium">Inspector:</span>{' '}
                  {inspection.user_profiles?.name || 'Unknown'}
                </p>
                {inspection.approval_notes && (
                  <p>
                    <span className="font-medium">Notes:</span> {inspection.approval_notes}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500 border-t pt-3">
            <p className="italic">
              This approval applies only to the inspected scope as documented in this report.
            </p>
          </div>
        </div>
      </div>

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-full">
                <Shield className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Approve Inspection Report
                </h3>
                <p className="text-sm text-slate-600">
                  You are approving this inspection report. This action will apply an official status stamp
                  to the exported document.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Approval Notes (Optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Add any notes about this approval..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedStatus(inspection.inspection_status || 'Draft');
                  setApprovalNotes('');
                }}
                disabled={updating}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateStatus(selectedStatus, true)}
                disabled={updating}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {updating ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
