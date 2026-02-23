import { useState } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreateBlockLevelModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Level {
  tempId: string;
  name: string;
  description: string;
  order_index: number;
}

export function CreateBlockLevelModal({ projectId, onClose, onSuccess }: CreateBlockLevelModalProps) {
  const [blockName, setBlockName] = useState('');
  const [blockDescription, setBlockDescription] = useState('');
  const [levels, setLevels] = useState<Level[]>([
    { tempId: '1', name: '', description: '', order_index: 0 }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addLevel = () => {
    const newLevel: Level = {
      tempId: Date.now().toString(),
      name: '',
      description: '',
      order_index: levels.length
    };
    setLevels([...levels, newLevel]);
  };

  const removeLevel = (tempId: string) => {
    if (levels.length <= 1) {
      setError('At least one level is required');
      return;
    }
    const updatedLevels = levels
      .filter(l => l.tempId !== tempId)
      .map((l, index) => ({ ...l, order_index: index }));
    setLevels(updatedLevels);
  };

  const updateLevel = (tempId: string, field: keyof Level, value: string | number) => {
    setLevels(levels.map(l =>
      l.tempId === tempId ? { ...l, [field]: value } : l
    ));
  };

  const moveLevel = (tempId: string, direction: 'up' | 'down') => {
    const index = levels.findIndex(l => l.tempId === tempId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === levels.length - 1)
    ) {
      return;
    }

    const newLevels = [...levels];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newLevels[index], newLevels[swapIndex]] = [newLevels[swapIndex], newLevels[index]];

    const reindexed = newLevels.map((l, idx) => ({ ...l, order_index: idx }));
    setLevels(reindexed);
  };

  const handleSave = async () => {
    setError('');

    if (!blockName.trim()) {
      setError('Block name is required');
      return;
    }

    const emptyLevels = levels.filter(l => !l.name.trim());
    if (emptyLevels.length > 0) {
      setError('All levels must have a name');
      return;
    }

    setSaving(true);
    try {
      const { data: blockData, error: blockError } = await supabase
        .from('blocks')
        .insert({
          project_id: projectId,
          name: blockName.trim(),
          description: blockDescription.trim() || null
        })
        .select()
        .single();

      if (blockError) throw blockError;

      const levelsToInsert = levels.map(l => ({
        block_id: blockData.id,
        name: l.name.trim(),
        description: l.description.trim() || null,
        order_index: l.order_index
      }));

      const { error: levelsError } = await supabase
        .from('levels')
        .insert(levelsToInsert);

      if (levelsError) throw levelsError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating block/levels:', err);
      setError(err.message || 'Failed to create block and levels');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Create Block & Levels</h2>
            <p className="text-sm text-slate-400 mt-1">
              Define a new block with hierarchical levels for your project
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Block Information */}
          <div className="bg-slate-700/50 rounded-lg p-5 border border-slate-600">
            <h3 className="text-lg font-semibold text-white mb-4">Block Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Block Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={blockName}
                  onChange={(e) => setBlockName(e.target.value)}
                  placeholder="e.g., Block A, Tower 1, West Wing"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={blockDescription}
                  onChange={(e) => setBlockDescription(e.target.value)}
                  placeholder="Add any additional details about this block..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Levels */}
          <div className="bg-slate-700/50 rounded-lg p-5 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Levels</h3>
              <button
                onClick={addLevel}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Level
              </button>
            </div>

            <div className="space-y-3">
              {levels.map((level, index) => (
                <div
                  key={level.tempId}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-start gap-3">
                    {/* Reorder Controls */}
                    <div className="flex flex-col gap-1 pt-2">
                      <button
                        onClick={() => moveLevel(level.tempId, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded ${
                          index === 0
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Move up"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveLevel(level.tempId, 'down')}
                        disabled={index === levels.length - 1}
                        className={`p-1 rounded ${
                          index === levels.length - 1
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Move down"
                      >
                        <GripVertical className="w-4 h-4 rotate-180" />
                      </button>
                    </div>

                    {/* Level Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={level.name}
                            onChange={(e) => updateLevel(level.tempId, 'name', e.target.value)}
                            placeholder="Level name (e.g., Ground Floor, Level 1)"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        {levels.length > 1 && (
                          <button
                            onClick={() => removeLevel(level.tempId)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Remove level"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          value={level.description}
                          onChange={(e) => updateLevel(level.tempId, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Tip:</strong> Levels are hierarchical sections within a block.
                Order them from bottom to top or as per your project structure.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="text-sm text-slate-400">
            {levels.length} level{levels.length !== 1 ? 's' : ''} defined
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {saving ? 'Creating...' : 'Create Block & Levels'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
