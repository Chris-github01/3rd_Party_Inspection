import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BlockedRedirectLog } from '../../lib/urlValidation';

interface SecurityLog {
  id: string;
  event_type: string;
  user_id: string | null;
  details: BlockedRedirectLog;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
}

export default function SecurityLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'blocked_redirect' | 'warning' | 'error'>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading security logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'blocked_redirect') return log.event_type === 'blocked_redirect';
    return log.severity === filter;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-900/30 text-red-300 border-red-700',
      error: 'bg-orange-900/30 text-orange-300 border-orange-700',
      warning: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
      info: 'bg-blue-900/30 text-blue-300 border-blue-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[severity as keyof typeof colors] || colors.info}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Security Logs</h1>
          </div>
          <p className="text-slate-300">
            Monitor security events including blocked redirect attempts and unauthorized access
          </p>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilter('blocked_redirect')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'blocked_redirect'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Blocked Redirects
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'warning'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Warnings
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'error'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Errors
            </button>
            <div className="ml-auto">
              <button
                onClick={loadLogs}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Events</p>
                <p className="text-2xl font-bold text-white">{logs.length}</p>
              </div>
              <Info className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Blocked Redirects</p>
                <p className="text-2xl font-bold text-white">
                  {logs.filter((l) => l.event_type === 'blocked_redirect').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Warnings</p>
                <p className="text-2xl font-bold text-white">
                  {logs.filter((l) => l.severity === 'warning').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Errors</p>
                <p className="text-2xl font-bold text-white">
                  {logs.filter((l) => l.severity === 'error' || l.severity === 'critical').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading security logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No security events found</p>
              <p className="text-slate-400 text-sm mt-1">The system is secure</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-200">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-200">
                      Event Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-200">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-200">
                      Details
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-200">
                      User
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(log.severity)}
                          <span className="text-sm text-slate-300">{log.event_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getSeverityBadge(log.severity)}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-300">
                          {log.event_type === 'blocked_redirect' && (
                            <div>
                              <p className="font-medium text-red-300">
                                Attempted URL: {log.details.attemptedUrl}
                              </p>
                              <p className="text-slate-400 text-xs mt-1">
                                Reason: {log.details.reason}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {log.user_id ? log.user_id.slice(0, 8) : 'Anonymous'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-6 bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-blue-300 font-semibold mb-1">URL Redirect Security Active</h3>
              <p className="text-blue-200 text-sm">
                Only redirects to <code className="bg-blue-800/50 px-2 py-0.5 rounded">
                  https://3rd-party-coatings-i-udgh.bolt.host/
                </code> are allowed.
                All other redirect attempts are automatically blocked and logged here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
