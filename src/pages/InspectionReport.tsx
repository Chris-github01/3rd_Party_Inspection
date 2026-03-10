import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { InspectionReportHeader } from '../components/reports/InspectionReportHeader';
import { InspectionReportFooter } from '../components/reports/InspectionReportFooter';
import { InspectionSummaryPage } from '../components/reports/InspectionSummaryPage';
import { InspectionReadingsTable } from '../components/reports/InspectionReadingsTable';
import { calculateReadingStats, buildHistogram } from '../lib/readingStatistics';
import { Printer, ArrowLeft } from 'lucide-react';
import '../styles/report-print.css';

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
}

interface Reading {
  id: string;
  sequence_number: number;
  dft_average: number;
  status: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  organizations: {
    name: string;
    logo_url: string | null;
  };
}

export default function InspectionReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [readingsMap, setReadingsMap] = useState<Map<string, Reading[]>>(new Map());

  const projectId = searchParams.get('projectId');
  const memberIds = searchParams.get('memberIds')?.split(',') || [];
  const batchName = searchParams.get('batchName') || undefined;

  useEffect(() => {
    if (projectId && memberIds.length > 0) {
      loadReportData();
    }
  }, [projectId, memberIds]);

  async function loadReportData() {
    setLoading(true);
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          organizations!inner (
            name,
            logo_url
          )
        `)
        .eq('id', projectId)
        .single();

      if (projectData) {
        setProject(projectData);
      }

      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .in('id', memberIds)
        .order('member_mark');

      if (membersData) {
        setMembers(membersData);

        const readingsData = new Map<string, Reading[]>();
        for (const member of membersData) {
          const { data: readings } = await supabase
            .from('inspection_readings')
            .select('id, sequence_number, dft_average, status, created_at')
            .eq('member_id', member.id)
            .order('sequence_number');

          if (readings) {
            readingsData.set(member.id, readings);
          }
        }
        setReadingsMap(readingsData);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleBack() {
    navigate(-1);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading report...</div>
      </div>
    );
  }

  if (!project || members.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No data available for this report.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-container">
      {/* Print Controls */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow-lg"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
        >
          <Printer size={18} />
          Print / Save as PDF
        </button>
      </div>

      {/* Generate report pages for each member */}
      {members.map((member, memberIndex) => {
        const readings = readingsMap.get(member.id) || [];
        if (readings.length === 0) return null;

        const dftValues = readings.map(r => r.dft_average);
        const stats = calculateReadingStats(dftValues);
        const histogram = buildHistogram(dftValues, 8);

        return (
          <div key={member.id}>
            {/* Page 1: Summary with Charts and Metadata */}
            <div className="report-page page-break">
              <InspectionReportHeader
                projectName={project.name}
                batchName={batchName}
                logoUrl={project.organizations.logo_url || undefined}
              />

              <InspectionSummaryPage
                member={member}
                readings={readings}
                stats={stats}
                histogram={histogram}
                projectName={project.name}
                batchName={batchName}
              />

              <InspectionReportFooter
                companyName={project.organizations.name}
                pageNumber={memberIndex * 2 + 1}
                totalPages={members.length * 2}
              />
            </div>

            {/* Page 2: Readings Table */}
            <div className="report-page">
              <InspectionReportHeader
                title="Inspection Readings"
                projectName={project.name}
                batchName={batchName}
                logoUrl={project.organizations.logo_url || undefined}
              />

              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Member: {member.member_mark}
                </h2>
                <p className="text-sm text-gray-600">
                  Total Readings: {readings.length} | Required DFT: {member.required_dft_microns} µm
                </p>
              </div>

              <InspectionReadingsTable readings={readings} />

              <InspectionReportFooter
                companyName={project.organizations.name}
                pageNumber={memberIndex * 2 + 2}
                totalPages={members.length * 2}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
