import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, UserPlus, Mail, Shield } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  role: string;
  created_at: string;
  email?: string;
}

export function Members() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-300';
      case 'inspector':
        return 'bg-primary-500/20 text-primary-300';
      case 'client':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-white/10 text-white';
    }
  };

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
              <h1 className="text-3xl font-bold text-white">Team Members</h1>
              <p className="text-blue-100 mt-1">Manage team members and their access levels</p>
            </div>
            {profile?.role === 'admin' && (
              <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <UserPlus className="w-5 h-5 mr-2" />
                Invite Member
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border-2 border-dashed border-white/10 p-12 text-center">
            <Users className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No team members yet</h3>
            <p className="text-blue-100">Invite team members to collaborate</p>
          </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 backdrop-blur-sm border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-300 font-semibold mr-3">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-white">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 mr-2 text-blue-300" />
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${getRoleBadgeColor(
                              member.role
                            )}`}
                          >
                            {member.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-100">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
