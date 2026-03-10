import { ReadingsLineChart } from '../ReadingsLineChart';
import { ReadingsHistogram } from '../ReadingsHistogram';
import { MetadataPanel } from './MetadataPanel';
import { StatisticsTable } from './StatisticsTable';
import { format } from 'date-fns';
import type { HistogramBin } from '../../lib/readingStatistics';

interface InspectionSummaryPageProps {
  member: {
    member_mark: string;
    element_type: string;
    section: string;
    level: string;
    block: string;
    frr_minutes: number;
    coating_system: string;
    required_dft_microns: number;
  };
  readings: Array<{
    dft_average: number;
    created_at: string;
  }>;
  stats: {
    count: number;
    mean: number;
    max: number;
    min: number;
    range: number;
    standardDeviation: number;
    meanPlus3Sigma?: number;
    meanMinus3Sigma: number;
    covPercent: number;
  };
  histogram: HistogramBin[];
  projectName: string;
  batchName?: string;
}

export function InspectionSummaryPage({
  member,
  readings,
  stats,
  histogram,
  projectName,
  batchName,
}: InspectionSummaryPageProps) {
  const dftValues = readings.map(r => r.dft_average);
  const firstReadingDate = readings.length > 0 ? new Date(readings[0].created_at) : new Date();
  const lastReadingDate = readings.length > 0 ? new Date(readings[readings.length - 1].created_at) : new Date();

  return (
    <div className="summary-page grid grid-cols-12 gap-4">
      {/* Left Column - Charts */}
      <div className="col-span-7 space-y-4">
        {/* Line Chart */}
        <div className="chart-panel bg-white border border-gray-200 rounded shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">DFT Readings Trend</h3>
          <div className="h-64">
            <ReadingsLineChart
              values={dftValues}
              requiredDft={member.required_dft_microns}
              width="100%"
              height={240}
            />
          </div>
        </div>

        {/* Histogram */}
        <div className="chart-panel bg-white border border-gray-200 rounded shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Reading Distribution</h3>
          <div className="h-64">
            <ReadingsHistogram
              bins={histogram}
              width="100%"
              height={240}
            />
          </div>
        </div>
      </div>

      {/* Right Column - Metadata */}
      <div className="col-span-5 space-y-3">
        {/* Project Info */}
        <MetadataPanel
          title="Project"
          items={[
            { label: 'Name', value: projectName },
            { label: 'Member Mark', value: member.member_mark },
            { label: 'Element Type', value: member.element_type },
            { label: 'Section', value: member.section },
            { label: 'Level', value: member.level },
            { label: 'Block', value: member.block },
          ]}
        />

        {/* Gauge Info */}
        <MetadataPanel
          title="Gauge"
          items={[
            { label: 'Type', value: 'Digital DFT Gauge' },
            { label: 'Serial', value: 'N/A' },
          ]}
        />

        {/* Probe Info */}
        <MetadataPanel
          title="Probe"
          items={[
            { label: 'Type', value: 'Standard Probe' },
            { label: 'Serial', value: 'N/A' },
          ]}
        />

        {/* Batch Info */}
        <MetadataPanel
          title="Batch"
          items={[
            { label: 'Batch Name', value: batchName || member.member_mark },
            { label: 'Created', value: format(firstReadingDate, 'dd/MM/yyyy') },
            { label: 'First Reading', value: format(firstReadingDate, 'dd/MM/yyyy HH:mm') },
            { label: 'Last Reading', value: format(lastReadingDate, 'dd/MM/yyyy HH:mm') },
          ]}
        />

        {/* Calibration Info */}
        <MetadataPanel
          title="Calibration"
          items={[
            { label: 'Method', value: 'Standard Foil' },
            { label: 'Type', value: 'Two Point' },
            { label: 'Calibrated', value: format(new Date(), 'dd/MM/yyyy') },
            { label: 'Thick Foil', value: `${member.required_dft_microns} µm` },
            { label: 'Thin Foil', value: '0 µm' },
          ]}
        />

        {/* Statistics */}
        <StatisticsTable stats={stats} />
      </div>
    </div>
  );
}
