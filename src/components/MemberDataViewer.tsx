import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { calculateOverallSummary, type MemberSummary } from '../lib/simulationUtils';

interface MemberDataViewerProps {
  inspectionId: string;
}

export function MemberDataViewer({ inspectionId }: MemberDataViewerProps) {
  const [memberSets, setMemberSets] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallSummary, setOverallSummary] = useState<any>(null);

  useEffect(() => {
    loadMemberSets();
  }, [inspectionId]);

  useEffect(() => {
    if (selectedMemberId) {
      loadReadings(selectedMemberId);
    }
  }, [selectedMemberId]);

  const loadMemberSets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inspection_member_sets')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('member_name');

      if (error) throw error;

      setMemberSets(data || []);

      if (data && data.length > 0) {
        setSelectedMemberId(data[0].id);

        const summaries: MemberSummary[] = data.map((set) => set.summary_json as MemberSummary);
        const overall = calculateOverallSummary(summaries);
        setOverallSummary(overall);
      }
    } catch (error) {
      console.error('Error loading member sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReadings = async (memberSetId: string) => {
    try {
      const { data, error } = await supabase
        .from('inspection_member_readings')
        .select('*')
        .eq('member_set_id', memberSetId)
        .order('reading_no');

      if (error) throw error;
      setReadings(data || []);
    } catch (error) {
      console.error('Error loading readings:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading simulation data...</div>;
  }

  if (memberSets.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No simulated data generated yet.</p>
        <p className="text-sm text-gray-500 mt-1">
          Enable Simulation Mode above and generate datasets to view data here.
        </p>
      </div>
    );
  }

  const selectedSet = memberSets.find((set) => set.id === selectedMemberId);
  const summary = selectedSet?.summary_json as MemberSummary;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>SIMULATED DATASET</strong> – Generated using range parameters (min/max). Not field
          measurements.
        </div>
      </div>

      {overallSummary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">All Members Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">Member Name</th>
                  <th className="text-center py-2 px-3 font-semibold">Readings</th>
                  <th className="text-center py-2 px-3 font-semibold">Min (µm)</th>
                  <th className="text-center py-2 px-3 font-semibold">Max (µm)</th>
                  <th className="text-center py-2 px-3 font-semibold">Avg (µm)</th>
                  <th className="text-center py-2 px-3 font-semibold">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {memberSets.map((set) => {
                  const setSum = set.summary_json as MemberSummary;
                  return (
                    <tr key={set.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{set.member_name}</td>
                      <td className="text-center py-2 px-3">{setSum.readingsCount}</td>
                      <td className="text-center py-2 px-3">{setSum.minDft}</td>
                      <td className="text-center py-2 px-3">{setSum.maxDft}</td>
                      <td className="text-center py-2 px-3">{setSum.avgDft}</td>
                      <td className="text-center py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                            setSum.compliance === 'PASS'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {setSum.compliance === 'PASS' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {setSum.compliance}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-gray-600">Total Members</div>
              <div className="text-lg font-semibold">{overallSummary.totalMembers}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Total Readings</div>
              <div className="text-lg font-semibold">{overallSummary.totalReadings}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Members Passed</div>
              <div className="text-lg font-semibold text-green-600">
                {overallSummary.membersPassed}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Members Failed</div>
              <div className="text-lg font-semibold text-red-600">
                {overallSummary.membersFailed}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Member</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border rounded"
          >
            {memberSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.member_name}
              </option>
            ))}
          </select>
        </div>

        {summary && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-lg mb-3">
              Member: {selectedSet?.member_name}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-600">Required</div>
                <div className="text-sm font-semibold">{summary.requiredThickness} µm</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Average</div>
                <div className="text-sm font-semibold">{summary.avgDft} µm</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Min</div>
                <div className="text-sm font-semibold">{summary.minDft} µm</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Max</div>
                <div className="text-sm font-semibold">{summary.maxDft} µm</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Std Dev</div>
                <div className="text-sm font-semibold">{summary.stdDev}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">≥ Required</div>
                <div className="text-sm font-semibold">{summary.percentAboveRequired}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">{'<'} Required</div>
                <div className="text-sm font-semibold">{summary.percentBelowRequired}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Compliance</div>
                <div
                  className={`text-sm font-semibold ${
                    summary.compliance === 'PASS' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {summary.compliance}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-3 font-semibold">Reading No</th>
                <th className="text-right py-2 px-3 font-semibold">DFT (µm)</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">{reading.reading_no}</td>
                  <td className="text-right py-2 px-3 font-mono">{reading.dft_microns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
