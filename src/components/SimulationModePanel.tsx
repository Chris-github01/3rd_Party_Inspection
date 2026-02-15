import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Plus, Trash2, RefreshCw } from 'lucide-react';
import {
  generateSimulatedReadings,
  calculateSummary,
  type MemberConfig,
  type MemberSummary,
} from '../lib/simulationUtils';

interface SimulationModePanelProps {
  inspectionId: string;
  onDataGenerated: () => void;
}

export function SimulationModePanel({ inspectionId, onDataGenerated }: SimulationModePanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [requiredThickness, setRequiredThickness] = useState<number>(425);
  const [lowestValue, setLowestValue] = useState<number>(400);
  const [highestValue, setHighestValue] = useState<number>(550);
  const [readingsPerMember, setReadingsPerMember] = useState<number>(100);
  const [numberOfMembers, setNumberOfMembers] = useState<number>(1);
  const [memberNames, setMemberNames] = useState<string[]>(['']);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [existingMemberSets, setExistingMemberSets] = useState<any[]>([]);

  useEffect(() => {
    loadExistingData();
  }, [inspectionId]);

  useEffect(() => {
    const newNames = Array(numberOfMembers).fill('');
    for (let i = 0; i < Math.min(numberOfMembers, memberNames.length); i++) {
      newNames[i] = memberNames[i];
    }
    setMemberNames(newNames);
  }, [numberOfMembers]);

  const loadExistingData = async () => {
    const { data: inspection } = await supabase
      .from('inspections')
      .select('dft_simulation_enabled')
      .eq('id', inspectionId)
      .single();

    if (inspection?.dft_simulation_enabled) {
      setEnabled(true);
    }

    const { data: memberSets } = await supabase
      .from('inspection_member_sets')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at');

    setExistingMemberSets(memberSets || []);
  };

  const validateInputs = (): string[] => {
    const errs: string[] = [];

    if (isNaN(requiredThickness) || requiredThickness <= 0) {
      errs.push('Required Thickness must be a positive number');
    }
    if (isNaN(lowestValue) || lowestValue <= 0) {
      errs.push('Lowest Value must be a positive number');
    }
    if (isNaN(highestValue) || highestValue <= 0) {
      errs.push('Highest Value must be a positive number');
    }
    if (lowestValue >= highestValue) {
      errs.push('Lowest Value must be less than Highest Value');
    }
    if (isNaN(readingsPerMember) || readingsPerMember < 1) {
      errs.push('Readings per Member must be at least 1');
    }
    if (numberOfMembers < 1) {
      errs.push('Number of Members must be at least 1');
    }

    const trimmedNames = memberNames.map((n) => n.trim()).filter((n) => n !== '');
    if (trimmedNames.length !== numberOfMembers) {
      errs.push('All member names are required and cannot be blank');
    }

    const lowerNames = trimmedNames.map((n) => n.toLowerCase());
    const uniqueNames = new Set(lowerNames);
    if (uniqueNames.size !== lowerNames.length) {
      errs.push('Member names must be unique (case-insensitive)');
    }

    return errs;
  };

  const handleGenerate = async () => {
    const validationErrors = validateInputs();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setGenerating(true);

    try {
      await supabase
        .from('inspections')
        .update({ dft_simulation_enabled: true })
        .eq('id', inspectionId);

      for (let i = 0; i < numberOfMembers; i++) {
        const memberName = memberNames[i].trim();

        const config: MemberConfig = {
          memberName,
          requiredThickness,
          minValue: lowestValue,
          maxValue: highestValue,
          readingsPerMember,
        };

        const readings = generateSimulatedReadings(config);
        const summary = calculateSummary(memberName, config, readings);

        const { data: existingSet } = await supabase
          .from('inspection_member_sets')
          .select('id')
          .eq('inspection_id', inspectionId)
          .ilike('member_name', memberName)
          .maybeSingle();

        let memberSetId: string;

        if (existingSet) {
          await supabase
            .from('inspection_member_readings')
            .delete()
            .eq('member_set_id', existingSet.id);

          await supabase
            .from('inspection_member_sets')
            .update({
              required_thickness_microns: requiredThickness,
              min_value_microns: lowestValue,
              max_value_microns: highestValue,
              readings_per_member: readingsPerMember,
              summary_json: summary,
            })
            .eq('id', existingSet.id);

          memberSetId = existingSet.id;
        } else {
          const { data: newSet, error } = await supabase
            .from('inspection_member_sets')
            .insert({
              inspection_id: inspectionId,
              member_name: memberName,
              required_thickness_microns: requiredThickness,
              min_value_microns: lowestValue,
              max_value_microns: highestValue,
              readings_per_member: readingsPerMember,
              is_simulated: true,
              summary_json: summary,
            })
            .select()
            .single();

          if (error) throw error;
          memberSetId = newSet.id;
        }

        const readingsToInsert = readings.map((r) => ({
          member_set_id: memberSetId,
          reading_no: r.readingNo,
          dft_microns: r.dftMicrons,
        }));

        await supabase.from('inspection_member_readings').insert(readingsToInsert);
      }

      await loadExistingData();
      onDataGenerated();
    } catch (error) {
      console.error('Error generating datasets:', error);
      setErrors(['Failed to generate datasets. Please try again.']);
    } finally {
      setGenerating(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all simulated data for this inspection?')) {
      return;
    }

    try {
      await supabase
        .from('inspection_member_sets')
        .delete()
        .eq('inspection_id', inspectionId);

      await supabase
        .from('inspections')
        .update({ dft_simulation_enabled: false })
        .eq('id', inspectionId);

      setEnabled(false);
      setExistingMemberSets([]);
      onDataGenerated();
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      await supabase
        .from('inspections')
        .update({ dft_simulation_enabled: false })
        .eq('id', inspectionId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Testing Data Section (Simulation Mode)</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Enable Simulation Mode</span>
        </label>
      </div>

      {enabled && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Simulation Mode is for demonstration purposes only.</strong>
              <br />
              Generated values are not actual field measurements.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Thickness (µm) *
              </label>
              <input
                type="number"
                value={requiredThickness}
                onChange={(e) => setRequiredThickness(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded"
                min="0"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lowest Value (µm) *
              </label>
              <input
                type="number"
                value={lowestValue}
                onChange={(e) => setLowestValue(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded"
                min="0"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Highest Value (µm) *
              </label>
              <input
                type="number"
                value={highestValue}
                onChange={(e) => setHighestValue(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded"
                min="0"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Readings per Member *
              </label>
              <input
                type="number"
                value={readingsPerMember}
                onChange={(e) => setReadingsPerMember(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded"
                min="1"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Members *
              </label>
              <input
                type="number"
                value={numberOfMembers}
                onChange={(e) => setNumberOfMembers(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded"
                min="1"
                max="50"
                step="1"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Member Names *
            </label>
            <div className="space-y-2">
              {memberNames.map((name, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 w-8">
                    {index + 1})
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...memberNames];
                      newNames[index] = e.target.value;
                      setMemberNames(newNames);
                    }}
                    placeholder={`e.g., 410UB${index + 1}`}
                    className="flex-1 px-3 py-2 border rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <ul className="list-disc list-inside text-sm text-red-800">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Generate Datasets
                </>
              )}
            </button>

            {existingMemberSets.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          {existingMemberSets.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Generated Members ({existingMemberSets.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {existingMemberSets.map((set) => (
                  <span
                    key={set.id}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {set.member_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
