import { useState, useEffect } from 'react';
import { ReadingsLineChart } from './ReadingsLineChart';
import { ReadingsHistogram } from './ReadingsHistogram';
import { supabase } from '../lib/supabase';
import {
  calculateReadingStats,
  buildHistogram,
  evaluateCompliance,
} from '../lib/readingStatistics';

interface Member {
  id: string;
  member_mark: string;
  element_type: string;
  section: string;
  level: string;
  block: string;
  frr_minutes: number;
  coating_system: string;
  required_dft_microns: number;
  quantity: number;
}

interface InspectionReading {
  id: string;
  member_id: string;
  sequence_number: number;
  dft_average: number;
}

interface MemberStatisticsViewProps {
  projectId: string;
  memberIds: string[];
}

export function MemberStatisticsView({ projectId, memberIds }: MemberStatisticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [readingsMap, setReadingsMap] = useState<Map<string, InspectionReading[]>>(new Map());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId, memberIds]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .in('id', memberIds)
        .order('member_mark');

      if (membersData) {
        setMembers(membersData);
        if (membersData.length > 0 && !selectedMemberId) {
          setSelectedMemberId(membersData[0].id);
        }

        const readingsData = new Map<string, InspectionReading[]>();
        for (const member of membersData) {
          const { data: readings } = await supabase
            .from('inspection_readings')
            .select('id, member_id, sequence_number, dft_average')
            .eq('member_id', member.id)
            .order('sequence_number');

          if (readings) {
            readingsData.set(member.id, readings);
          }
        }
        setReadingsMap(readingsData);
      }
    } catch (error) {
      console.error('Error loading statistics data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading statistics...</div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No members selected for statistical analysis.
      </div>
    );
  }

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const readings = selectedMemberId ? readingsMap.get(selectedMemberId) || [] : [];
  const dftValues = readings.map(r => r.dft_average);

  const stats = dftValues.length > 0 ? calculateReadingStats(dftValues) : null;
  const compliance = stats && selectedMember
    ? evaluateCompliance(selectedMember.required_dft_microns, stats)
    : null;
  const histogram = dftValues.length > 0 ? buildHistogram(dftValues, 8) : [];

  return (
    <div className="space-y-6">
      {/* Member Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Member for Analysis
        </label>
        <select
          value={selectedMemberId || ''}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {members.map(member => (
            <option key={member.id} value={member.id}>
              {member.member_mark} ({readingsMap.get(member.id)?.length || 0} readings)
            </option>
          ))}
        </select>
      </div>

      {selectedMember && (
        <>
          {/* Member Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedMember.member_mark}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Element Type:</span>
                <div className="font-medium">{selectedMember.element_type}</div>
              </div>
              <div>
                <span className="text-gray-500">Section:</span>
                <div className="font-medium">{selectedMember.section}</div>
              </div>
              <div>
                <span className="text-gray-500">FRR:</span>
                <div className="font-medium">{selectedMember.frr_minutes} min</div>
              </div>
              <div>
                <span className="text-gray-500">Required DFT:</span>
                <div className="font-medium">{selectedMember.required_dft_microns} µm</div>
              </div>
            </div>
          </div>

          {readings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No readings available for this member.
            </div>
          ) : (
            <>
              {/* Statistics Summary */}
              {stats && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Statistical Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
                      <div className="text-sm text-gray-500">Readings</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-gray-900">{stats.mean.toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Mean (µm)</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-gray-900">{stats.standardDeviation.toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Std Dev (µm)</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-gray-900">{stats.covPercent.toFixed(1)}%</div>
                      <div className="text-sm text-gray-500">COV</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex justify-between p-2 border-b">
                      <span className="text-gray-600">Maximum:</span>
                      <span className="font-medium">{stats.max} µm</span>
                    </div>
                    <div className="flex justify-between p-2 border-b">
                      <span className="text-gray-600">Minimum:</span>
                      <span className="font-medium">{stats.min} µm</span>
                    </div>
                    <div className="flex justify-between p-2 border-b">
                      <span className="text-gray-600">Range:</span>
                      <span className="font-medium">{stats.range} µm</span>
                    </div>
                    <div className="flex justify-between p-2 border-b">
                      <span className="text-gray-600">Mean - 3σ:</span>
                      <span className="font-medium">{stats.meanMinus3Sigma.toFixed(1)} µm</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Compliance Status */}
              {compliance && compliance.requiredDft !== null && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Compliance Status
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Required DFT:</span>
                      <span className="font-medium">{compliance.requiredDft} µm</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Mean ≥ Required:</span>
                      <span className={`font-medium ${compliance.meanPass ? 'text-green-600' : 'text-red-600'}`}>
                        {compliance.meanPass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Min ≥ 90% Required:</span>
                      <span className={`font-medium ${compliance.minPass ? 'text-green-600' : 'text-red-600'}`}>
                        {compliance.minPass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Mean - 3σ ≥ 90% Required:</span>
                      <span className={`font-medium ${compliance.meanMinus3SigmaPass ? 'text-green-600' : 'text-red-600'}`}>
                        {compliance.meanMinus3SigmaPass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg mt-4">
                      <span className="font-semibold text-gray-700">Overall Status:</span>
                      <span className={`font-bold text-lg ${compliance.overallPass ? 'text-green-600' : 'text-red-600'}`}>
                        {compliance.overallPass ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Line Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  DFT Readings Trend
                </h4>
                <ReadingsLineChart
                  values={dftValues}
                  requiredDft={selectedMember.required_dft_microns}
                  width="100%"
                  height={400}
                />
              </div>

              {/* Histogram */}
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  Reading Distribution
                </h4>
                <ReadingsHistogram
                  bins={histogram}
                  width="100%"
                  height={400}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
