import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  FolderOpen,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Plus,
  Users,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

interface KPIData {
  activeProjects: number;
  inspectionsThisMonth: number;
  openNCRs: number;
  passRate: number;
}

interface Activity {
  id: string;
  type: 'inspection' | 'ncr' | 'export';
  description: string;
  timestamp: string;
  project_name?: string;
}

export function DashboardHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIData>({
    activeProjects: 0,
    inspectionsThisMonth: 0,
    openNCRs: 0,
    passRate: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [projectsRes, inspectionsRes, ncrsRes, inspectionsThisMonthRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id')
          .neq('status', 'archived'),
        supabase
          .from('inspections')
          .select('result'),
        supabase
          .from('ncrs')
          .select('id')
          .neq('status', 'closed'),
        supabase
          .from('inspections')
          .select('id')
          .gte('created_at', startOfMonth.toISOString()),
      ]);

      const activeProjects = projectsRes.data?.length || 0;
      const inspectionsThisMonth = inspectionsThisMonthRes.data?.length || 0;
      const openNCRs = ncrsRes.data?.length || 0;

      const inspections = inspectionsRes.data || [];
      const passed = inspections.filter((i) => i.result === 'pass').length;
      const passRate = inspections.length > 0 ? (passed / inspections.length) * 100 : 0;

      setKpis({
        activeProjects,
        inspectionsThisMonth,
        openNCRs,
        passRate,
      });

      const { data: recentInspections } = await supabase
        .from('inspections')
        .select('id, created_at, result, projects(name), members(member_mark)')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentNCRs } = await supabase
        .from('ncrs')
        .select('id, created_at, ncr_number, status, projects(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      const activityList: Activity[] = [];

      recentInspections?.forEach((insp: any) => {
        activityList.push({
          id: insp.id,
          type: 'inspection',
          description: `Inspection of ${insp.members?.member_mark || 'member'} - ${insp.result?.toUpperCase()}`,
          timestamp: insp.created_at,
          project_name: insp.projects?.name,
        });
      });

      recentNCRs?.forEach((ncr: any) => {
        activityList.push({
          id: ncr.id,
          type: 'ncr',
          description: `NCR-${ncr.ncr_number} - ${ncr.status?.replace('_', ' ').toUpperCase()}`,
          timestamp: ncr.created_at,
          project_name: ncr.projects?.name,
        });
      });

      activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(activityList.slice(0, 10));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Welcome back, {profile?.name}</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.activeProjects}</h3>
            <p className="text-sm text-slate-600">Active Projects</p>
          </div>

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ClipboardCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.inspectionsThisMonth}</h3>
            <p className="text-sm text-slate-600">Inspections This Month</p>
          </div>

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.openNCRs}</h3>
            <p className="text-sm text-slate-600">Open NCRs</p>
          </div>

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.passRate.toFixed(1)}%</h3>
            <p className="text-sm text-slate-600">Pass Rate</p>
          </div>
        </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            {canEdit && (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/clients?new=true')}
                  className="w-full flex items-center p-3 text-left border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Create Client</p>
                    <p className="text-xs text-slate-500">Add new client record</p>
                  </div>
                  <Plus className="w-5 h-5 text-slate-400" />
                </button>

                <button
                  onClick={() => navigate('/projects?new=true')}
                  className="w-full flex items-center p-3 text-left border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <FolderOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Create Project</p>
                    <p className="text-xs text-slate-500">Start new inspection project</p>
                  </div>
                  <Plus className="w-5 h-5 text-slate-400" />
                </button>

                <button
                  onClick={() => navigate('/projects')}
                  className="w-full flex items-center p-3 text-left border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <ClipboardCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">New Inspection</p>
                    <p className="text-xs text-slate-500">Choose project then member</p>
                  </div>
                  <Plus className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          )}

            {/* Recent Activity */}
            <div className={`bg-slate-50 rounded-lg border border-slate-200 p-6 ${canEdit ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-lg mr-3 ${
                        activity.type === 'inspection'
                          ? 'bg-green-100'
                          : activity.type === 'ncr'
                          ? 'bg-red-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {activity.type === 'inspection' ? (
                        <ClipboardCheck
                          className={`w-4 h-4 ${
                            activity.type === 'inspection' ? 'text-green-600' : ''
                          }`}
                        />
                      ) : activity.type === 'ncr' ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : (
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                      {activity.project_name && (
                        <p className="text-xs text-slate-500 truncate">{activity.project_name}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(activity.timestamp), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
