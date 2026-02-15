import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MapPin, Search, Filter } from 'lucide-react';

interface Pin {
  id: string;
  member_name: string;
  label: string;
  status: string;
  package_id: string;
  updated_at: string;
  inspection_packages?: {
    name: string;
    frr_minutes: number;
  };
  levels?: {
    name: string;
    blocks?: {
      name: string;
    };
  };
}

export function PinsList() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [pins, setPins] = useState<Pin[]>([]);
  const [filteredPins, setFilteredPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPins();
  }, [projectId]);

  useEffect(() => {
    filterPins();
  }, [pins, searchQuery, statusFilter]);

  const loadPins = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('drawing_pins')
      .select(`
        *,
        inspection_packages(name, frr_minutes),
        levels(name, blocks(name))
      `)
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading pins:', error);
      return;
    }

    setPins(data || []);
    setLoading(false);
  };

  const filterPins = () => {
    let filtered = pins;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((pin) => pin.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pin) =>
          pin.member_name?.toLowerCase().includes(query) ||
          pin.label?.toLowerCase().includes(query) ||
          pin.inspection_packages?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredPins(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_started':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Not Started</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>In Progress</span>
          </span>
        );
      case 'pass':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Passed</span>
          </span>
        );
      case 'repair_required':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded">
            <div className="w-2 h-2 rounded-full bg-slate-500"></div>
            <span>Unknown</span>
          </span>
        );
    }
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return pins.length;
    return pins.filter((pin) => pin.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by member name..."
            />
          </div>
          <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-1">
          <FilterChip
            label="All"
            count={getStatusCount('all')}
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <FilterChip
            label="Not Started"
            count={getStatusCount('not_started')}
            active={statusFilter === 'not_started'}
            onClick={() => setStatusFilter('not_started')}
            color="blue"
          />
          <FilterChip
            label="In Progress"
            count={getStatusCount('in_progress')}
            active={statusFilter === 'in_progress'}
            onClick={() => setStatusFilter('in_progress')}
            color="yellow"
          />
          <FilterChip
            label="Passed"
            count={getStatusCount('pass')}
            active={statusFilter === 'pass'}
            onClick={() => setStatusFilter('pass')}
            color="green"
          />
          <FilterChip
            label="Failed"
            count={getStatusCount('repair_required')}
            active={statusFilter === 'repair_required'}
            onClick={() => setStatusFilter('repair_required')}
            color="red"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredPins.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No pins found' : 'No pins yet'}
            </h3>
            <p className="text-slate-600">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Drop pins on drawings to start inspecting'}
            </p>
          </div>
        ) : (
          filteredPins.map((pin) => (
            <button
              key={pin.id}
              onClick={() => navigate(`/projects/${projectId}/site/pins/${pin.id}`)}
              className="w-full bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {pin.member_name || pin.label || 'Unnamed Pin'}
                  </h3>
                  {pin.inspection_packages && (
                    <p className="text-sm text-slate-600">
                      {pin.inspection_packages.name} ({pin.inspection_packages.frr_minutes} min)
                    </p>
                  )}
                </div>
                {getStatusBadge(pin.status)}
              </div>

              {pin.levels && (
                <p className="text-xs text-slate-500">
                  {pin.levels.blocks?.name} - {pin.levels.name}
                </p>
              )}

              <p className="text-xs text-slate-400 mt-2">
                Updated {new Date(pin.updated_at).toLocaleDateString()}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  color = 'slate',
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  const colorClasses = {
    slate: active ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-700',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700',
    yellow: active ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700',
    green: active ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700',
    red: active ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      <span>{label}</span>
      <span
        className={`px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-white bg-opacity-20' : 'bg-black bg-opacity-10'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
