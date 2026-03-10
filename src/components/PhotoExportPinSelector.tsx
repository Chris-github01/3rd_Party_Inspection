import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, Check, X, Upload, Trash2, Image as ImageIcon, CheckSquare } from 'lucide-react';
import { getPinPhotos } from '../lib/pinPhotoUtils';

interface Pin {
  pin_id: string;
  pin_number: string;
  label: string;
  status: string;
  steel_type: string;
  member_mark: string;
  section_size: string;
  element_type: string;
  photo_count: number;
  has_photos: boolean;
}

interface PhotoExportPinSelectorProps {
  projectId: string;
  projectName: string;
  onSelectionChange?: (selectedPinIds: string[]) => void;
}

export function PhotoExportPinSelector({
  projectId,
  projectName,
  onSelectionChange
}: PhotoExportPinSelectorProps) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPinIds, setSelectedPinIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [expandedPinId, setExpandedPinId] = useState<string | null>(null);
  const [pinPhotos, setPinPhotos] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadPins();
  }, [projectId]);

  useEffect(() => {
    onSelectionChange?.(Array.from(selectedPinIds));
  }, [selectedPinIds, onSelectionChange]);

  const loadPins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_pins_for_photo_export_selection', {
        p_project_id: projectId
      });

      if (error) throw error;
      setPins(data || []);
    } catch (error) {
      console.error('Error loading pins:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPinPhotos = async (pinId: string) => {
    try {
      const photos = await getPinPhotos(pinId);
      setPinPhotos(prev => ({ ...prev, [pinId]: photos }));
    } catch (error) {
      console.error('Error loading pin photos:', error);
    }
  };

  const togglePin = (pinId: string) => {
    setSelectedPinIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pinId)) {
        newSet.delete(pinId);
      } else {
        newSet.add(pinId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedPinIds.size === pins.length) {
      setSelectedPinIds(new Set());
    } else {
      setSelectedPinIds(new Set(pins.map(p => p.pin_id)));
    }
  };

  const handleFileUpload = async (pinId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingFor(pinId);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('image/')) {
          alert('Only image files are allowed');
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${pinId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `${projectId}/${pinId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pin-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('pin_photos')
          .insert({
            pin_id: pinId,
            file_path: filePath,
            file_name: file.name,
            caption: '',
            sort_order: i
          });

        if (dbError) throw dbError;
      }

      await loadPins();
      if (expandedPinId === pinId) {
        await loadPinPhotos(pinId);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploadingFor(null);
    }
  };

  const deletePhoto = async (pinId: string, photoId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await supabase.storage
        .from('pin-photos')
        .remove([filePath]);

      await supabase
        .from('pin_photos')
        .delete()
        .eq('id', photoId);

      await loadPins();
      await loadPinPhotos(pinId);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    }
  };

  const toggleExpand = async (pinId: string) => {
    if (expandedPinId === pinId) {
      setExpandedPinId(null);
    } else {
      setExpandedPinId(pinId);
      if (!pinPhotos[pinId]) {
        await loadPinPhotos(pinId);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">Loading pins...</div>
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <Camera className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-300 mb-2">No Pins Available</h3>
        <p className="text-slate-400 text-sm">
          Create pins in Site Manager to generate photo reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {selectedPinIds.size} selected for report
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <CheckSquare className="w-4 h-4" />
          {selectedPinIds.size === pins.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2 bg-slate-800/50 rounded-lg p-4">
        {pins.map((pin) => {
          const isSelected = selectedPinIds.has(pin.pin_id);
          const isExpanded = expandedPinId === pin.pin_id;
          const photos = pinPhotos[pin.pin_id] || [];

          return (
            <div
              key={pin.pin_id}
              className="bg-slate-700 rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePin(pin.pin_id)}
                    className="mt-1 w-5 h-5 rounded border-slate-500 bg-slate-600 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-semibold text-primary-400">
                        {pin.pin_number}
                      </span>
                      {pin.status && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          pin.status === 'pass'
                            ? 'bg-green-500/20 text-green-300'
                            : pin.status === 'fail'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {pin.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-slate-300 mb-1">
                      {pin.label || pin.member_mark}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-slate-400">Steel Type:</span>
                        <span className="text-white ml-2">{pin.steel_type || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Member:</span>
                        <span className="text-white ml-2">{pin.member_mark || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Section:</span>
                        <span className="text-white ml-2">{pin.section_size || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Camera className="w-3 h-3 text-slate-400" />
                        <span className="text-white">{pin.photo_count} photos</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload(pin.pin_id, e.target.files)}
                          className="hidden"
                          disabled={uploadingFor === pin.pin_id}
                        />
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded text-xs transition-colors">
                          <Upload className="w-3 h-3" />
                          {uploadingFor === pin.pin_id ? 'Uploading...' : 'Add Photos'}
                        </span>
                      </label>

                      {pin.photo_count > 0 && (
                        <button
                          onClick={() => toggleExpand(pin.pin_id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs transition-colors"
                        >
                          <ImageIcon className="w-3 h-3" />
                          {isExpanded ? 'Hide' : 'View'} Photos
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="grid grid-cols-3 gap-3">
                      {photos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt={photo.file_name}
                              className="w-full h-24 object-cover rounded border border-slate-600"
                            />
                          ) : (
                            <div className="w-full h-24 bg-slate-600 rounded flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <button
                            onClick={() => deletePhoto(pin.pin_id, photo.id, photo.file_path)}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                          <div className="text-xs text-slate-400 mt-1 truncate">
                            {photo.file_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
