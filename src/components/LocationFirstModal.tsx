import { useState, useEffect } from 'react';
import { X, MapPin, Grid, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LocationFirstModalProps {
  projectId: string;
  onClose: () => void;
  onLocationSelected: (location: LocationData) => void;
  recordType: 'inspection' | 'ncr';
}

interface LocationData {
  type: 'pin' | 'zone' | 'block_level';
  pinId?: string;
  blockId?: string;
  levelId?: string;
  label: string;
  memberId?: string;
  memberMark?: string;
}

interface Pin {
  id: string;
  label: string;
  pin_number: string;
  member_id: string;
  members?: { member_mark: string };
}

interface Block {
  id: string;
  name: string;
}

interface Level {
  id: string;
  name: string;
  block_id: string;
}

export function LocationFirstModal({ projectId, onClose, onLocationSelected, recordType }: LocationFirstModalProps) {
  const [step, setStep] = useState<'location' | 'type'>('location');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocationData();
  }, [projectId]);

  const loadLocationData = async () => {
    setLoading(true);
    try {
      const [pinsRes, blocksRes, levelsRes] = await Promise.all([
        supabase
          .from('drawing_pins')
          .select('id, label, pin_number, member_id, members(member_mark)')
          .eq('project_id', projectId)
          .order('pin_number'),
        supabase
          .from('blocks')
          .select('id, name')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('levels')
          .select('id, name, block_id')
          .order('name'),
      ]);

      setPins(pinsRes.data || []);
      setBlocks(blocksRes.data || []);
      setLevels(levelsRes.data || []);
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    // For inspections, we proceed to type selection
    // For NCRs, we can proceed directly if needed
    if (recordType === 'inspection') {
      setStep('type');
    } else {
      onLocationSelected(location);
    }
  };

  const handleTypeSelect = (systemType: string) => {
    if (selectedLocation) {
      onLocationSelected({ ...selectedLocation, systemType } as any);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading location data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {step === 'location' ? 'Select Location' : 'Select System Type'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {step === 'location'
                ? 'Choose where this record will be located'
                : 'Choose the type of inspection'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step === 'location' ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step === 'location' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                1
              </div>
              <span className="text-sm font-medium">Location</span>
            </div>
            <div className="flex-1 h-px bg-slate-300"></div>
            <div className={`flex items-center gap-2 ${step === 'type' ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step === 'type' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                2
              </div>
              <span className="text-sm font-medium">Type</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'location' && (
            <div className="space-y-6">
              {/* Pins Section */}
              {pins.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Drawing Pins</h3>
                    <span className="text-sm text-slate-500">({pins.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pins.map((pin) => (
                      <button
                        key={pin.id}
                        onClick={() =>
                          handleLocationSelect({
                            type: 'pin',
                            pinId: pin.id,
                            label: pin.label || pin.pin_number || 'Unnamed Pin',
                            memberId: pin.member_id,
                            memberMark: pin.members?.member_mark,
                          })
                        }
                        className="text-left p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                      >
                        <div className="font-medium text-slate-800">
                          {pin.pin_number || 'Pin'}
                        </div>
                        {pin.label && (
                          <div className="text-sm text-slate-600 mt-1">{pin.label}</div>
                        )}
                        {pin.members?.member_mark && (
                          <div className="text-xs text-slate-500 mt-1">
                            Member: {pin.members.member_mark}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocks & Levels Section */}
              {blocks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Grid className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-slate-800">Blocks & Levels</h3>
                  </div>
                  <div className="space-y-4">
                    {blocks.map((block) => {
                      const blockLevels = levels.filter((l) => l.block_id === block.id);
                      return (
                        <div key={block.id} className="border border-slate-200 rounded-lg p-4">
                          <div className="font-medium text-slate-800 mb-3">{block.name}</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {blockLevels.map((level) => (
                              <button
                                key={level.id}
                                onClick={() =>
                                  handleLocationSelect({
                                    type: 'block_level',
                                    blockId: block.id,
                                    levelId: level.id,
                                    label: `${block.name} - ${level.name}`,
                                  })
                                }
                                className="p-3 border border-slate-200 rounded hover:border-green-500 hover:bg-green-50 transition-all text-sm"
                              >
                                {level.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Locations Message */}
              {pins.length === 0 && blocks.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">No Locations Configured</h3>
                  <p className="text-slate-600 mb-4">
                    You need to set up locations in Site Manager before creating {recordType}s.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go to Site Manager
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'type' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleTypeSelect('intumescent')}
                  className="p-6 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <Package className="w-8 h-8 text-blue-600 mb-2" />
                  <div className="font-semibold text-slate-800">Intumescent</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Thin-film fire protection inspection
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect('cementitious')}
                  className="p-6 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
                >
                  <Package className="w-8 h-8 text-green-600 mb-2" />
                  <div className="font-semibold text-slate-800">Cementitious</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Spray fire protection inspection
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect('fire_stopping')}
                  className="p-6 border-2 border-slate-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all text-left"
                >
                  <Package className="w-8 h-8 text-red-600 mb-2" />
                  <div className="font-semibold text-slate-800">Fire Stopping</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Penetration seal inspection
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect('general')}
                  className="p-6 border-2 border-slate-200 rounded-lg hover:border-slate-500 hover:bg-slate-50 transition-all text-left"
                >
                  <Package className="w-8 h-8 text-slate-600 mb-2" />
                  <div className="font-semibold text-slate-800">General Inspection</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Other inspection types
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => setStep('location')}
                  className="text-sm text-slate-600 hover:text-slate-800"
                >
                  ← Back to Location Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
