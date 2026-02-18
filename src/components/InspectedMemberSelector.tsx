import { useState, useEffect } from 'react';
import { CheckSquare, Square, Image as ImageIcon, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InspectedMember {
  pin_id: string;
  pin_number: string;
  steel_type: string;
  label: string;
  status: string;
  member_mark: string;
  section_size: string;
  photo_count: number;
  created_at: string;
}

interface InspectedMemberSelectorProps {
  projectId: string;
  onSelectionChange?: (selectedPinIds: string[]) => void;
  onGenerateReport?: (selectedPinIds: string[]) => void;
}

export function InspectedMemberSelector({
  projectId,
  onSelectionChange,
  onGenerateReport,
}: InspectedMemberSelectorProps) {
  const [members, setMembers] = useState<InspectedMember[]>([]);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    loadInspectedMembers();
  }, [projectId]);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedPins));
    }
  }, [selectedPins, onSelectionChange]);

  const loadInspectedMembers = async () => {
    setLoading(true);
    try {
      const { data: pinsData, error: pinsError } = await supabase
        .from('drawing_pins')
        .select(`
          id,
          pin_number,
          steel_type,
          label,
          status,
          member_id,
          created_at
        `)
        .eq('project_id', projectId)
        .eq('pin_type', 'inspection')
        .not('pin_number', 'is', null)
        .order('pin_number', { ascending: true });

      if (pinsError) throw pinsError;

      if (!pinsData || pinsData.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const memberIds = pinsData
        .map(p => p.member_id)
        .filter(id => id !== null);

      let membersMap = new Map();
      if (memberIds.length > 0) {
        const { data: membersData } = await supabase
          .from('members')
          .select('id, member_mark, section_size')
          .in('id', memberIds);

        if (membersData) {
          membersMap = new Map(membersData.map(m => [m.id, m]));
        }
      }

      const pinIds = pinsData.map(p => p.id);
      const { data: photosData } = await supabase
        .from('pin_photos')
        .select('pin_id, id')
        .in('pin_id', pinIds);

      const photoCounts = new Map<string, number>();
      if (photosData) {
        photosData.forEach(photo => {
          photoCounts.set(photo.pin_id, (photoCounts.get(photo.pin_id) || 0) + 1);
        });
      }

      const inspectedMembers: InspectedMember[] = pinsData.map(pin => {
        const member = pin.member_id ? membersMap.get(pin.member_id) : null;
        return {
          pin_id: pin.id,
          pin_number: pin.pin_number || '',
          steel_type: pin.steel_type || '',
          label: pin.label || '',
          status: pin.status || 'not_started',
          member_mark: member?.member_mark || 'N/A',
          section_size: member?.section_size || 'N/A',
          photo_count: photoCounts.get(pin.id) || 0,
          created_at: pin.created_at,
        };
      });

      setMembers(inspectedMembers);
    } catch (error) {
      console.error('Error loading inspected members:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = (pinId: string) => {
    const newSelected = new Set(selectedPins);
    if (newSelected.has(pinId)) {
      newSelected.delete(pinId);
    } else {
      newSelected.add(pinId);
    }
    setSelectedPins(newSelected);
    setSelectAll(newSelected.size === members.length);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPins(new Set());
      setSelectAll(false);
    } else {
      setSelectedPins(new Set(members.map(m => m.pin_id)));
      setSelectAll(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'repair_required':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'in_progress':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'not_started':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
  };

  const handleGenerateReport = () => {
    if (onGenerateReport) {
      onGenerateReport(Array.from(selectedPins));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">No Inspected Members</h3>
        <p className="text-sm text-slate-400">
          Create inspection pins with pin numbers to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Inspected Members ({members.length})
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {selectedPins.size} selected for report
          </p>
        </div>
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 border border-slate-600"
        >
          {selectAll ? (
            <>
              <CheckSquare className="w-4 h-4" />
              <span>Deselect All</span>
            </>
          ) : (
            <>
              <Square className="w-4 h-4" />
              <span>Select All</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {members.map((member) => {
          const isSelected = selectedPins.has(member.pin_id);
          return (
            <div
              key={member.pin_id}
              onClick={() => togglePin(member.pin_id)}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all
                ${
                  isSelected
                    ? 'bg-primary-900/30 border-primary-500'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-primary-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-lg font-bold text-primary-400">
                        {member.pin_number}
                      </h4>
                      <p className="text-sm text-white font-medium">{member.label}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 border rounded ${getStatusColor(
                        member.status
                      )}`}
                    >
                      {member.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span className="text-slate-400">Steel Type:</span>
                      <span className="text-white ml-2">{member.steel_type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Member:</span>
                      <span className="text-white ml-2">{member.member_mark}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Section:</span>
                      <span className="text-white ml-2">{member.section_size}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-white">
                        {member.photo_count} {member.photo_count === 1 ? 'photo' : 'photos'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onGenerateReport && selectedPins.size > 0 && (
        <div className="sticky bottom-0 pt-4 pb-2 bg-slate-900">
          <button
            onClick={handleGenerateReport}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
          >
            <FileText className="w-5 h-5" />
            <span>Generate Report with {selectedPins.size} Members</span>
          </button>
        </div>
      )}
    </div>
  );
}
