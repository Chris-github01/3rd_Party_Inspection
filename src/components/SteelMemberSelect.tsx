import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Tag, X } from 'lucide-react';

interface SteelMember {
  id: string;
  designation: string;
  family: string;
  standard: string;
  is_standard: boolean;
  depth_mm?: number;
  width_mm?: number;
  thickness_mm?: number;
  mass_kg_per_m?: number;
}

interface SteelMemberSelectProps {
  value: string;
  memberId?: string;
  onChange: (member: { id: string; designation: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}

type FamilyFilter = 'ALL' | 'UB' | 'UC' | 'PFC' | 'WB' | 'RHS' | 'SHS' | 'CHS' | 'EA' | 'UA';

export function SteelMemberSelect({
  value,
  memberId,
  onChange,
  placeholder = 'Search steel member...',
  disabled = false,
}: SteelMemberSelectProps) {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [results, setResults] = useState<SteelMember[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>('ALL');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchQuery) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, familyFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('search_steel_members', {
        q: searchQuery || null,
        fam: familyFilter === 'ALL' ? null : familyFilter,
        lim: 20,
      });

      if (error) throw error;

      setResults(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching steel members:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setShowResults(true);
  };

  const handleSelectMember = (member: SteelMember) => {
    setSearchQuery(member.designation);
    onChange({ id: member.id, designation: member.designation });
    setShowResults(false);
  };

  const handleInputFocus = () => {
    if (searchQuery) {
      performSearch();
    }
    setShowResults(true);
  };

  const handleAddCustomClick = () => {
    setShowAddCustom(true);
    setShowResults(false);
  };

  const handleCustomMemberAdded = (member: { id: string; designation: string }) => {
    setSearchQuery(member.designation);
    onChange(member);
    setShowAddCustom(false);
  };

  const getFamilyColor = (family: string) => {
    const colors: { [key: string]: string } = {
      UB: 'bg-blue-100 text-blue-800',
      UC: 'bg-indigo-100 text-indigo-800',
      PFC: 'bg-purple-100 text-purple-800',
      WB: 'bg-pink-100 text-pink-800',
      RHS: 'bg-green-100 text-green-800',
      SHS: 'bg-teal-100 text-teal-800',
      CHS: 'bg-cyan-100 text-cyan-800',
      EA: 'bg-orange-100 text-orange-800',
      UA: 'bg-amber-100 text-amber-800',
    };
    return colors[family] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
          placeholder={placeholder}
        />
        {searchQuery && !disabled && (
          <button
            onClick={() => {
              setSearchQuery('');
              onChange({ id: '', designation: '' });
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {showResults && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col"
        >
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 overflow-x-auto">
            <div className="flex space-x-2">
              {(['ALL', 'UB', 'UC', 'PFC', 'WB', 'RHS', 'SHS', 'CHS'] as FamilyFilter[]).map(
                (family) => (
                  <button
                    key={family}
                    onClick={() => setFamilyFilter(family)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      familyFilter === family
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {family}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {results.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className="w-full px-4 py-3 hover:bg-slate-50 transition-colors text-left flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {member.designation}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getFamilyColor(
                            member.family
                          )}`}
                        >
                          {member.family}
                        </span>
                        {member.standard && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {member.standard}
                          </span>
                        )}
                        {!member.is_standard && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                      {(member.depth_mm || member.width_mm || member.thickness_mm) && (
                        <div className="text-xs text-slate-500">
                          {member.depth_mm && `D:${member.depth_mm}mm `}
                          {member.width_mm && `W:${member.width_mm}mm `}
                          {member.thickness_mm && `T:${member.thickness_mm}mm`}
                        </div>
                      )}
                    </div>
                    <Tag className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No members found for &quot;{searchQuery}&quot;</p>
                <button
                  onClick={handleAddCustomClick}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Add Custom Member</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Type to search steel members</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddCustom && (
        <AddCustomMemberModal
          initialDesignation={searchQuery}
          onClose={() => setShowAddCustom(false)}
          onMemberAdded={handleCustomMemberAdded}
        />
      )}
    </div>
  );
}

interface AddCustomMemberModalProps {
  initialDesignation: string;
  onClose: () => void;
  onMemberAdded: (member: { id: string; designation: string }) => void;
}

function AddCustomMemberModal({
  initialDesignation,
  onClose,
  onMemberAdded,
}: AddCustomMemberModalProps) {
  const [formData, setFormData] = useState({
    designation: initialDesignation,
    family: 'UB' as const,
    depth_mm: '',
    width_mm: '',
    thickness_mm: '',
    mass_kg_per_m: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.designation.trim()) {
      alert('Please enter a designation');
      return;
    }

    setSubmitting(true);

    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('steel_members')
        .insert({
          designation: formData.designation.trim(),
          family: formData.family,
          standard: 'NZ',
          depth_mm: formData.depth_mm ? parseFloat(formData.depth_mm) : null,
          width_mm: formData.width_mm ? parseFloat(formData.width_mm) : null,
          thickness_mm: formData.thickness_mm ? parseFloat(formData.thickness_mm) : null,
          mass_kg_per_m: formData.mass_kg_per_m ? parseFloat(formData.mass_kg_per_m) : null,
          notes: formData.notes || null,
          is_standard: false,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          alert('This member designation already exists');
        } else {
          throw error;
        }
        return;
      }

      onMemberAdded({ id: data.id, designation: data.designation });
    } catch (error) {
      console.error('Error creating custom member:', error);
      alert('Failed to create custom member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Add Custom Member</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Designation *
            </label>
            <input
              type="text"
              required
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 410UB54 or 150x100x6 RHS"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Member Family *
            </label>
            <select
              required
              value={formData.family}
              onChange={(e) => setFormData({ ...formData, family: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="UB">Universal Beam (UB)</option>
              <option value="UC">Universal Column (UC)</option>
              <option value="PFC">Parallel Flange Channel (PFC)</option>
              <option value="WB">Welded Beam (WB)</option>
              <option value="RHS">Rectangular Hollow Section (RHS)</option>
              <option value="SHS">Square Hollow Section (SHS)</option>
              <option value="CHS">Circular Hollow Section (CHS)</option>
              <option value="EA">Equal Angle (EA)</option>
              <option value="UA">Unequal Angle (UA)</option>
              <option value="PLATE">Plate</option>
              <option value="FLAT">Flat Bar</option>
              <option value="BAR">Round Bar</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Depth (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.depth_mm}
                onChange={(e) => setFormData({ ...formData, depth_mm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Width (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.width_mm}
                onChange={(e) => setFormData({ ...formData, width_mm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Thickness (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.thickness_mm}
                onChange={(e) => setFormData({ ...formData, thickness_mm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mass (kg/m)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.mass_kg_per_m}
                onChange={(e) => setFormData({ ...formData, mass_kg_per_m: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
