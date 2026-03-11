import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Download, Plus, CreditCard as Edit3, Trash2, FileText, MapPin, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../contexts/ToastContext';
import { generatePinCorrectionsReport } from '../lib/pdfPinCorrectionsReport';

interface Project {
  id: string;
  name: string;
}

interface Correction {
  id: string;
  correction_type: string;
  original_label: string | null;
  corrected_label: string | null;
  issue_description: string;
  severity: string;
  corrected_at: string;
  drawing_name: string;
  pin_number: string | null;
}

interface CorrectionBatch {
  id: string;
  batch_name: string;
  description: string;
  status: string;
  total_corrections: number;
  created_at: string;
}

export function PinCorrectionsTab({ project }: { project: Project }) {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [batches, setBatches] = useState<CorrectionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadCorrections();
    loadBatches();
  }, [project.id]);

  const loadCorrections = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('pin_corrections')
        .select(`
          *,
          drawings!inner(
            page_number,
            levels!inner(name, blocks!inner(name))
          )
        `)
        .eq('project_id', project.id)
        .order('corrected_at', { ascending: false });

      if (error) throw error;

      const formattedCorrections: Correction[] = (data || []).map((c: any) => ({
        id: c.id,
        correction_type: c.correction_type,
        original_label: c.original_label,
        corrected_label: c.corrected_label,
        issue_description: c.issue_description,
        severity: c.severity,
        corrected_at: c.corrected_at,
        drawing_name: `${c.drawings?.levels?.blocks?.name} - ${c.drawings?.levels?.name}`,
        pin_number: c.corrected_label || c.original_label || 'N/A',
      }));

      setCorrections(formattedCorrections);
    } catch (error: any) {
      console.error('Error loading corrections:', error);
      showToast('error', 'Failed to load corrections');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('pin_correction_batches')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBatches(data || []);
    } catch (error: any) {
      console.error('Error loading batches:', error);
    }
  };

  const createBatch = async () => {
    if (!batchName.trim()) {
      showToast('error', 'Please enter a batch name');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('pin_correction_batches').insert({
        project_id: project.id,
        batch_name: batchName,
        description: batchDescription,
        status: 'draft',
        created_by: userData.user?.id,
      });

      if (error) throw error;

      showToast('success', 'Correction batch created');
      setBatchName('');
      setBatchDescription('');
      setShowNewBatch(false);
      loadBatches();
    } catch (error: any) {
      console.error('Error creating batch:', error);
      showToast('error', 'Failed to create batch');
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      showToast('info', 'Generating corrections report...');

      const batchId = selectedBatch === 'all' ? undefined : selectedBatch;
      const blob = await generatePinCorrectionsReport(project.id, batchId);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pin_Corrections_Report_${project.name.replace(/\s+/g, '_')}_${format(
        new Date(),
        'yyyyMMdd'
      )}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Corrections report generated successfully');
    } catch (error: any) {
      console.error('Error generating report:', error);
      showToast('error', 'Failed to generate corrections report');
    } finally {
      setGenerating(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getCorrectionTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      position: 'Position',
      missing: 'Missing Pin',
      duplicate: 'Duplicate',
      incorrect_label: 'Label',
      status_change: 'Status',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const filteredCorrections =
    selectedBatch === 'all'
      ? corrections
      : corrections.filter((c: any) => c.batch_id === selectedBatch);

  const stats = {
    total: filteredCorrections.length,
    critical: filteredCorrections.filter((c) => c.severity === 'critical').length,
    high: filteredCorrections.filter((c) => c.severity === 'high').length,
    medium: filteredCorrections.filter((c) => c.severity === 'medium').length,
    low: filteredCorrections.filter((c) => c.severity === 'low').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading corrections...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pin Corrections</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track and report pin placement corrections and issues
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewBatch(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Batch
          </button>
          <button
            onClick={generateReport}
            disabled={generating || corrections.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {generating ? 'Downloading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Corrections</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-sm text-red-600">Critical</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</div>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="text-sm text-orange-600">High</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{stats.high}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="text-sm text-yellow-600">Medium</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.medium}</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-sm text-green-600">Low</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.low}</div>
        </div>
      </div>

      {showNewBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create Correction Batch</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Phase 1 Corrections"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewBatch(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createBatch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Batch:</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Corrections</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_name} ({batch.total_corrections} corrections)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredCorrections.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No pin corrections recorded yet</p>
              <p className="text-sm mt-2">
                Corrections will appear here when pins are adjusted in the Site Manager
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Drawing
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Issue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCorrections.map((correction) => (
                  <tr key={correction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {correction.pin_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {correction.drawing_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {getCorrectionTypeLabel(correction.correction_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                          correction.severity
                        )}`}
                      >
                        {correction.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {correction.issue_description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {correction.original_label && correction.corrected_label && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">{correction.original_label}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="text-green-600">{correction.corrected_label}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(correction.corrected_at), 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900">About Pin Corrections Reports</h4>
            <p className="text-sm text-blue-700 mt-1">
              The corrections report provides visual before/after comparisons showing original and
              corrected pin positions on drawings. Each correction is marked with color-coded
              indicators and includes detailed annotations explaining the issue and resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
