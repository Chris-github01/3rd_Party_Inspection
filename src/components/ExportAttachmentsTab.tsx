import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Trash2, FileText, ArrowUp, ArrowDown, AlertCircle, Eye, Image as ImageIcon, Download, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { convertImageToPdf } from '../lib/pdfUtils';

interface ExportAttachment {
  id: string;
  project_id: string;
  document_id: string;
  sequence_no: number;
  uploaded_at: string;
  uploaded_by_user_id: string;
  is_active: boolean;
  source_type: string;
  mime_type: string;
  converted_pdf_document_id: string | null;
  display_title: string | null;
  appendix_category: string | null;
  documents: {
    filename: string;
    size_bytes: number;
    storage_path: string;
    mime_type: string;
  };
  user_profiles?: {
    name: string;
  };
}

const APPENDIX_CATEGORIES = [
  'Drawing',
  'Elcometer / DFT Export',
  'Product Data Sheet (PDS)',
  'Safety Data Sheet (SDS)',
  'NCR Evidence',
  'Photo Evidence',
  'Other',
];

interface ExportAttachmentsTabProps {
  projectId: string;
}

export function ExportAttachmentsTab({ projectId }: ExportAttachmentsTabProps) {
  const { profile } = useAuth();
  const [attachments, setAttachments] = useState<ExportAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ display_title: string; appendix_category: string }>({
    display_title: '',
    appendix_category: '',
  });

  useEffect(() => {
    loadAttachments();
  }, [projectId]);

  const loadAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_export_attachments')
        .select(`
          *,
          documents(filename, size_bytes, storage_path, mime_type),
          user_profiles(name)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('sequence_no', { ascending: true });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      for (const file of Array.from(files)) {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          setError(`${file.name} is not a supported file type. Only PDF, PNG, and JPG files are allowed.`);
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          setError(`${file.name} is too large. Maximum file size is 50MB.`);
          continue;
        }

        const isImage = file.type.startsWith('image/');
        const sourceType = isImage ? 'image' : 'pdf';

        const fileName = `${projectId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            project_id: projectId,
            filename: file.name,
            original_name: file.name,
            storage_path: uploadData.path,
            size_bytes: file.size,
            type: 'other',
            mime_type: file.type,
          })
          .select()
          .single();

        if (docError) throw docError;

        let convertedPdfDocId = null;

        if (isImage) {
          try {
            const pdfBlob = await convertImageToPdf(file);
            const pdfFileName = `${projectId}/${Date.now()}-converted-${file.name}.pdf`;

            const { data: pdfUploadData, error: pdfUploadError } = await supabase.storage
              .from('project-documents')
              .upload(pdfFileName, pdfBlob);

            if (pdfUploadError) throw pdfUploadError;

            const { data: pdfDocData, error: pdfDocError } = await supabase
              .from('documents')
              .insert({
                project_id: projectId,
                filename: `${file.name}_converted.pdf`,
                original_name: `${file.name}_converted.pdf`,
                storage_path: pdfUploadData.path,
                size_bytes: pdfBlob.size,
                type: 'other',
                mime_type: 'application/pdf',
              })
              .select()
              .single();

            if (pdfDocError) throw pdfDocError;
            convertedPdfDocId = pdfDocData.id;
          } catch (convError: any) {
            console.error('Image conversion error:', convError);
            setError(`Failed to convert ${file.name} to PDF: ${convError.message}`);
            continue;
          }
        }

        const { error: attachError } = await supabase
          .from('project_export_attachments')
          .insert({
            project_id: projectId,
            document_id: docData.id,
            uploaded_by_user_id: profile?.id,
            source_type: sourceType,
            mime_type: file.type,
            converted_pdf_document_id: convertedPdfDocId,
          });

        if (attachError) throw attachError;
      }

      await loadAttachments();
    } catch (err: any) {
      console.error('Error uploading attachment:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async (attachmentId: string, filename: string) => {
    if (!confirm(`Remove "${filename}" from export sequence?\n\nThe file will remain in Documents but won't be included in merged exports.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('project_export_attachments')
        .update({ is_active: false })
        .eq('id', attachmentId);

      if (error) throw error;
      await loadAttachments();
    } catch (err: any) {
      console.error('Error removing attachment:', err);
      alert(`Failed to remove attachment: ${err.message}`);
    }
  };

  const handleMoveUp = async (attachment: ExportAttachment) => {
    const currentIndex = attachments.findIndex((a) => a.id === attachment.id);
    if (currentIndex <= 0) return;

    const prevAttachment = attachments[currentIndex - 1];

    try {
      await supabase
        .from('project_export_attachments')
        .update({ sequence_no: prevAttachment.sequence_no })
        .eq('id', attachment.id);

      await supabase
        .from('project_export_attachments')
        .update({ sequence_no: attachment.sequence_no })
        .eq('id', prevAttachment.id);

      await loadAttachments();
    } catch (err: any) {
      console.error('Error reordering:', err);
      alert(`Failed to reorder: ${err.message}`);
    }
  };

  const handleMoveDown = async (attachment: ExportAttachment) => {
    const currentIndex = attachments.findIndex((a) => a.id === attachment.id);
    if (currentIndex >= attachments.length - 1) return;

    const nextAttachment = attachments[currentIndex + 1];

    try {
      await supabase
        .from('project_export_attachments')
        .update({ sequence_no: nextAttachment.sequence_no })
        .eq('id', attachment.id);

      await supabase
        .from('project_export_attachments')
        .update({ sequence_no: attachment.sequence_no })
        .eq('id', nextAttachment.id);

      await loadAttachments();
    } catch (err: any) {
      console.error('Error reordering:', err);
      alert(`Failed to reorder: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Remove ALL attachments from export sequence?\n\nFiles will remain in Documents but won\'t be included in merged exports.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('project_export_attachments')
        .update({ is_active: false })
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) throw error;
      await loadAttachments();
    } catch (err: any) {
      console.error('Error clearing attachments:', err);
      alert(`Failed to clear attachments: ${err.message}`);
    }
  };

  const handleDownload = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      alert(`Failed to download: ${err.message}`);
    }
  };

  const handleStartEdit = (attachment: ExportAttachment) => {
    setEditingId(attachment.id);
    setEditValues({
      display_title: attachment.display_title || attachment.documents.filename.replace(/\.[^/.]+$/, ''),
      appendix_category: attachment.appendix_category || '',
    });
  };

  const handleSaveEdit = async (attachmentId: string) => {
    try {
      const { error } = await supabase
        .from('project_export_attachments')
        .update({
          display_title: editValues.display_title || null,
          appendix_category: editValues.appendix_category || null,
        })
        .eq('id', attachmentId);

      if (error) throw error;

      setEditingId(null);
      await loadAttachments();
    } catch (err: any) {
      console.error('Error updating attachment:', err);
      alert(`Failed to update: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({ display_title: '', appendix_category: '' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-primary-900">
            <p className="font-medium mb-1">Export Attachments Merge Order</p>
            <p className="text-primary-700">
              When generating "Full Audit Pack (Merged PDF)", the system will:
            </p>
            <ol className="list-decimal ml-5 mt-2 space-y-1 text-primary-700">
              <li>Generate the inspection report PDF first</li>
              <li>Append PDFs/images from this list in the order shown below</li>
              <li>Images are automatically converted to single-page PDFs</li>
              <li>Most recently uploaded attachments appear last</li>
            </ol>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="pdf-upload"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer"
            >
              <Upload className="w-5 h-5 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Attachments'}
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <p className="text-xs text-slate-500 mt-2">
              Supports PDF, PNG, and JPG files (max 50MB each). Images auto-convert to PDF.
            </p>
          </div>

          {attachments.length > 0 && profile?.role === 'admin' && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
            >
              Clear All Attachments
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
          <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No export attachments</h3>
          <p className="text-slate-600 mb-6">
            Upload PDF or image files to append them to your merged audit pack exports
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">
              Preview Order ({attachments.length} {attachments.length === 1 ? 'attachment' : 'attachments'})
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Top to bottom = first to last in merged PDF
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            <div className="px-6 py-3 bg-slate-100 flex items-center text-xs font-medium text-slate-700 uppercase">
              <div className="w-10">#</div>
              <div className="w-14">Type</div>
              <div className="flex-1 min-w-0">Filename / Title</div>
              <div className="w-32">Category</div>
              <div className="w-24">Uploaded</div>
              <div className="w-24">By</div>
              <div className="w-20">Size</div>
              <div className="w-48">Actions</div>
            </div>

            {attachments.map((attachment, index) => (
              <div key={attachment.id} className="hover:bg-slate-50">
                <div className="px-6 py-4 flex items-center">
                  <div className="w-10">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-accent-100 text-accent-700 rounded-full text-xs font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                  </div>
                  <div className="w-14">
                    {attachment.source_type === 'image' ? (
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        <ImageIcon className="w-3 h-3 mr-1" />
                        IMG
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === attachment.id ? (
                      <input
                        type="text"
                        value={editValues.display_title}
                        onChange={(e) => setEditValues({ ...editValues, display_title: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-primary-300 rounded focus:ring-1 focus:ring-primary-500"
                        placeholder="Display title for divider page"
                      />
                    ) : (
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">
                          {attachment.display_title || attachment.documents.filename.replace(/\.[^/.]+$/, '')}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{attachment.documents.filename}</div>
                      </div>
                    )}
                  </div>
                  <div className="w-32">
                    {editingId === attachment.id ? (
                      <select
                        value={editValues.appendix_category}
                        onChange={(e) => setEditValues({ ...editValues, appendix_category: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-primary-300 rounded focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">None</option>
                        {APPENDIX_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-600">
                        {attachment.appendix_category || '-'}
                      </span>
                    )}
                  </div>
                  <div className="w-24 text-xs text-slate-600">
                    {format(new Date(attachment.uploaded_at), 'MMM d, HH:mm')}
                  </div>
                  <div className="w-24 text-xs text-slate-600 truncate">
                    {attachment.user_profiles?.name || 'Unknown'}
                  </div>
                  <div className="w-20 text-xs text-slate-600">
                    {formatFileSize(attachment.documents.size_bytes)}
                  </div>
                  <div className="w-48 flex items-center gap-1">
                    {canEdit && (
                      <>
                        {editingId === attachment.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(attachment.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(attachment)}
                            className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                            title="Edit metadata"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleMoveUp(attachment)}
                          disabled={index === 0}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(attachment)}
                          disabled={index === attachments.length - 1}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(attachment.documents.storage_path, attachment.documents.filename)}
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                          title="Download original"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(attachment.id, attachment.documents.filename)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Remove from export"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center text-sm text-slate-600">
              <Eye className="w-4 h-4 mr-2" />
              <span className="font-medium">Final merge order:</span>
              <span className="ml-2">
                [Generated Report] → {attachments.map((a, i) => `[${i + 1}]`).join(' → ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
