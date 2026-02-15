import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, FileText, X } from 'lucide-react';

interface ReportProfile {
  id: string;
  report_name: string;
  config_json: {
    sections: Record<string, boolean>;
    cover_page: Record<string, boolean>;
    references: string[];
  };
  created_at: string;
}

export function Reports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ReportProfile | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('report_profiles')
        .select('*')
        .order('report_name');

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report profile?')) return;

    try {
      const { error } = await supabase.from('report_profiles').delete().eq('id', id);
      if (error) throw error;
      await loadReports();
    } catch (error: any) {
      alert('Error deleting report: ' + error.message);
    }
  };

  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Report Profiles</h1>
              <p className="text-blue-100 mt-1">Configure report templates and settings</p>
            </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditingReport(null);
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Profile
            </button>
          )}
        </div>

          {reports.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border-2 border-dashed border-white/10 p-12 text-center">
            <FileText className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No report profiles yet</h3>
            <p className="text-blue-100 mb-6">Create your first report profile</p>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingReport(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Profile
              </button>
            )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:shadow-lg transition-shadow"
                >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {report.report_name}
                    </h3>
                    <div className="text-sm text-blue-100">
                      {Object.values(report.config_json?.sections || {}).filter(Boolean).length} sections enabled
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingReport(report);
                          setShowModal(true);
                        }}
                        className="p-1 text-primary-300 hover:bg-white/5 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-1 text-red-300 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ReportModal
          report={editingReport}
          onClose={() => {
            setShowModal(false);
            setEditingReport(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingReport(null);
            loadReports();
          }}
        />
      )}
    </div>
  );
}

function ReportModal({
  report,
  onClose,
  onSaved,
}: {
  report: ReportProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    report_name: report?.report_name || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        report_name: formData.report_name,
        config_json: report?.config_json || {
          sections: {
            appendices: true,
            references: true,
            dft_summary: true,
            introduction: true,
            ncr_register: true,
            standard_checks: true,
            executive_summary: true,
            visual_inspection: true,
          },
          cover_page: {
            show_date: true,
            show_client: true,
            show_inspector: true,
            show_contractor: true,
            show_site_address: true,
          },
          references: [
            'ISO 19840 - Paints and varnishes - Corrosion protection',
            'ISO 8501-1 - Preparation of steel substrates',
            'FPA NZ COP-3 - Code of Practice for Passive Fire Protection',
          ],
        },
      };

      if (report) {
        const { error } = await supabase
          .from('report_profiles')
          .update(data)
          .eq('id', report.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('report_profiles').insert(data);
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/5 backdrop-blur-sm rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {report ? 'Edit Report Profile' : 'New Report Profile'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Profile Name *
              </label>
              <input
                type="text"
                required
                value={formData.report_name}
                onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Standard Inspection Report"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : report ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
