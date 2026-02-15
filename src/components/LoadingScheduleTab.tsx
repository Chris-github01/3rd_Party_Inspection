import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Edit2, Save, X } from 'lucide-react';

interface LoadingScheduleTabProps {
  projectId: string;
}

interface ScheduleImport {
  id: string;
  source_type: string;
  status: string;
  page_count: number;
  artifact_json_path: string | null;
  result_json_path: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  document: any;
}

interface ScheduleItem {
  id: string;
  loading_schedule_ref: string | null;
  member_mark: string | null;
  element_type: string | null;
  section_size_raw: string;
  section_size_normalized: string;
  frr_minutes: number | null;
  frr_format: string | null;
  coating_product: string | null;
  dft_required_microns: number | null;
  needs_review: boolean;
  confidence: number;
  cite_page: number | null;
  cite_line_start: number | null;
  cite_line_end: number | null;
}

export function LoadingScheduleTab({ projectId }: LoadingScheduleTabProps) {
  const [imports, setImports] = useState<ScheduleImport[]>([]);
  const [selectedImport, setSelectedImport] = useState<ScheduleImport | null>(null);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  useEffect(() => {
    loadImports();
  }, [projectId]);

  useEffect(() => {
    if (selectedImport) {
      loadItems(selectedImport.id);
    }
  }, [selectedImport]);

  const loadImports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loading_schedule_imports')
        .select(`
          *,
          document:documents(*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading imports:', error);
        throw error;
      }

      setImports(data || []);

      // Auto-select most recent if available
      if (data && data.length > 0 && !selectedImport) {
        setSelectedImport(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading imports:', error);
      alert('Failed to load imports: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (importId: string) => {
    try {
      const { data, error } = await supabase
        .from('loading_schedule_items')
        .select('*')
        .eq('import_id', importId)
        .order('cite_line_start');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Determine source type
      const ext = file.name.split('.').pop()?.toLowerCase();
      const sourceType = ext === 'csv' ? 'csv' : ext === 'xlsx' ? 'xlsx' : ext === 'pdf' ? 'pdf' : 'other';

      // Upload to documents storage
      const filename = `loading-schedule-${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filename, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          type: 'fire_schedule',
          filename,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          storage_path: uploadData.path,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create loading_schedule_imports record
      const { data: importData, error: importError } = await supabase
        .from('loading_schedule_imports')
        .insert({
          project_id: projectId,
          document_id: docData.id,
          source_type: sourceType,
          status: 'queued',
        })
        .select()
        .single();

      if (importError) throw importError;

      // Trigger parsing
      setParsing(true);
      console.log('Invoking parse-loading-schedule with importId:', importData.id);

      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        'parse-loading-schedule',
        {
          body: { importId: importData.id },
        }
      );

      console.log('Parse response:', { data: parseResult, error: parseError });

      if (parseError) {
        console.error('Parse error:', parseError);
        console.error('Parse error details:', JSON.stringify(parseError, null, 2));
        console.error('Parse error context:', parseError.context);

        // Update import status to failed
        await supabase
          .from('loading_schedule_imports')
          .update({
            status: 'failed',
            error_code: 'EDGE_FUNCTION_ERROR',
            error_message: parseError.message || 'Edge function returned an error',
          })
          .eq('id', importData.id);

        const errorMsg = parseError.message || 'Unknown error';
        const errorDetails = parseError.context?.error || parseError.context || '';
        alert(`Failed to parse schedule:\n${errorMsg}\n\n${errorDetails}\n\nCheck browser console for full details.`);
      } else {
        console.log('Parse result:', parseResult);
        console.log('Parse result JSON:', JSON.stringify(parseResult, null, 2));
        if (parseResult?.success) {
          console.log(`Successfully parsed ${parseResult.itemsExtracted} items`);
          if (parseResult.itemsExtracted === 0) {
            console.warn('WARNING: No items were extracted. Check edge function logs for details.');
            console.log('Parse status:', parseResult.status);
            console.log('Needs review:', parseResult.needsReview);
          }
        }
      }

      // Reload imports
      await loadImports();
      if (parseError) {
        // If parsing failed, don't auto-select the failed import
        setSelectedImport(null);
      } else {
        setSelectedImport(importData);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Failed to upload: ' + error.message);
    } finally {
      setUploading(false);
      setParsing(false);
      e.target.value = '';
    }
  };

  const handleApproveAndSync = async () => {
    if (!selectedImport) return;

    try {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke(
        'sync-members-from-loading-schedule',
        {
          body: { importId: selectedImport.id, mode: 'create_missing_only' },
        }
      );

      if (error) throw error;

      alert(`Sync complete! Created ${data.stats.membersCreated} members, linked ${data.stats.membersLinked} existing members.`);

      // Update import status
      await supabase
        .from('loading_schedule_imports')
        .update({ status: 'completed' })
        .eq('id', selectedImport.id);

      await loadImports();
    } catch (error: any) {
      console.error('Sync error:', error);
      alert('Failed to sync: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditItem = (item: ScheduleItem) => {
    setEditingItem({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('loading_schedule_items')
        .update({
          member_mark: editingItem.member_mark,
          element_type: editingItem.element_type,
          section_size_normalized: editingItem.section_size_normalized,
          frr_minutes: editingItem.frr_minutes,
          frr_format: editingItem.frr_format,
          coating_product: editingItem.coating_product,
          dft_required_microns: editingItem.dft_required_microns,
          needs_review: false,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setEditingItem(null);
      if (selectedImport) {
        await loadItems(selectedImport.id);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      alert('Failed to save: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      queued: { color: 'bg-blue-500/20 text-blue-300', icon: Loader, label: 'Queued' },
      running: { color: 'bg-yellow-500/20 text-yellow-300', icon: Loader, label: 'Running' },
      completed: { color: 'bg-green-500/20 text-green-300', icon: CheckCircle, label: 'Completed' },
      failed: { color: 'bg-red-500/20 text-red-300', icon: AlertCircle, label: 'Failed' },
      needs_review: { color: 'bg-orange-500/20 text-orange-300', icon: AlertCircle, label: 'Needs Review' },
      partial_completed: { color: 'bg-yellow-500/20 text-yellow-300', icon: AlertCircle, label: 'Partial' },
    };

    const badge = badges[status] || badges.queued;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Upload Loading Schedule</h3>
        <p className="text-sm text-blue-200 mb-4">
          Upload a fire protection loading schedule (CSV, XLSX, or PDF) to automatically populate the member register.
        </p>

        <label className="flex items-center justify-center px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors">
          <Upload className="w-5 h-5 mr-2" />
          {uploading ? 'Uploading...' : parsing ? 'Parsing...' : 'Upload Loading Schedule'}
          <input
            type="file"
            accept=".csv,.xlsx,.pdf"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading || parsing}
          />
        </label>
      </div>

      {/* Imports List */}
      {imports.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Import History</h3>
          <div className="space-y-2">
            {imports.map((imp) => (
              <button
                key={imp.id}
                onClick={() => setSelectedImport(imp)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedImport?.id === imp.id
                    ? 'bg-primary-600/20 border-primary-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-300" />
                    <div>
                      <p className="text-white font-medium">{imp.document?.original_name}</p>
                      <p className="text-xs text-blue-200">
                        {new Date(imp.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(imp.status)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items Preview */}
      {selectedImport && items.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Extracted Items ({items.length})
              </h3>
              <p className="text-sm text-blue-200">
                {items.filter((i) => i.needs_review).length} items need review
              </p>
            </div>

            {selectedImport.status === 'completed' || selectedImport.status === 'needs_review' ? (
              <button
                onClick={handleApproveAndSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                {syncing ? 'Syncing...' : 'Approve & Create Member Register'}
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10 backdrop-blur-sm border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">Member Mark</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">Section</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">FRR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">DFT (µm)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase">Confidence</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-blue-200 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {items.map((item) => (
                  <tr key={item.id} className={`hover:bg-white/5 ${item.needs_review ? 'bg-yellow-500/10' : ''}`}>
                    <td className="px-4 py-3">
                      {item.needs_review ? (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{item.member_mark || '-'}</td>
                    <td className="px-4 py-3 text-sm text-blue-100">{item.section_size_normalized}</td>
                    <td className="px-4 py-3 text-sm text-blue-100">{item.frr_format || item.frr_minutes || '-'}</td>
                    <td className="px-4 py-3 text-sm text-blue-100">{item.coating_product || '-'}</td>
                    <td className="px-4 py-3 text-sm text-blue-100">{item.dft_required_microns || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.confidence >= 0.8 ? 'bg-green-500/20 text-green-300' :
                        item.confidence >= 0.6 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-1 text-primary-400 hover:bg-white/10 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Edit Schedule Item</h2>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Member Mark</label>
                  <input
                    type="text"
                    value={editingItem.member_mark || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, member_mark: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="B10, C234, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Section Size</label>
                  <input
                    type="text"
                    value={editingItem.section_size_normalized}
                    onChange={(e) => setEditingItem({ ...editingItem, section_size_normalized: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">FRR Minutes</label>
                    <input
                      type="number"
                      value={editingItem.frr_minutes || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, frr_minutes: parseInt(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">FRR Format</label>
                    <input
                      type="text"
                      value={editingItem.frr_format || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, frr_format: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="60/-/-, -/60/60, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Coating Product</label>
                  <input
                    type="text"
                    value={editingItem.coating_product || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, coating_product: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Nullifire SC601, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Required DFT (µm)</label>
                  <input
                    type="number"
                    value={editingItem.dft_required_microns || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, dft_required_microns: parseInt(e.target.value) || null })}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Element Type</label>
                  <select
                    value={editingItem.element_type || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, element_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select type</option>
                    <option value="beam">Beam</option>
                    <option value="column">Column</option>
                    <option value="brace">Brace</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-slate-700">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-white hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && imports.length === 0 && (
        <div className="text-center py-12 text-blue-200">
          <FileText className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <p className="text-lg font-medium text-white mb-2">No Loading Schedule Uploaded</p>
          <p className="text-sm">Upload a loading schedule to automatically populate the member register</p>
        </div>
      )}
    </div>
  );
}
