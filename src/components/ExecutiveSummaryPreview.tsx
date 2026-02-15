import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, XCircle, Loader2, Copy } from 'lucide-react';
import { generateExecutiveSummary } from '../lib/executiveSummaryGenerator';
import { generateStandaloneExecutiveSummaryPDF } from '../lib/pdfExecutiveSummary';

interface ExecutiveSummaryPreviewProps {
  projectId: string;
}

export function ExecutiveSummaryPreview({ projectId }: ExecutiveSummaryPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [activeView, setActiveView] = useState<'short' | 'full'>('short');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const result = await generateExecutiveSummary(projectId);
      setSummary(result);
    } catch (error) {
      console.error('Error generating executive summary:', error);
      alert('Failed to generate executive summary');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy =
      activeView === 'short' ? summary.short_summary_text : summary.full_summary_text;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      await generateStandaloneExecutiveSummaryPDF(
        projectId,
        `Executive_Summary_${summary.data.project.project_name.replace(/\s+/g, '_')}.pdf`
      );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Generating executive summary...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600">No summary data available</p>
      </div>
    );
  }

  const isCompliant = summary.overall_result === 'Compliant';

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-lg shadow-sm border border-white/10 overflow-hidden">
        <div className="border-b border-white/10 bg-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Executive Summary</h3>
              <p className="text-sm text-slate-400 mt-1">
                Auto-generated from inspection data
              </p>
            </div>
            <div
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                isCompliant
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isCompliant ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="font-semibold">{summary.overall_result}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('short')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'short'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Short Summary
            </button>
            <button
              onClick={() => setActiveView('full')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'full'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Full Legal Summary
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="bg-white/10 rounded-lg p-6 border border-white/10">
            <pre className="whitespace-pre-wrap font-sans text-white leading-relaxed">
              {activeView === 'short'
                ? summary.short_summary_text
                : summary.full_summary_text}
            </pre>
          </div>
        </div>

        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
          <div className="flex space-x-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/10 text-slate-300 rounded-lg hover:bg-white/20 transition-colors shadow-sm"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export to PDF</span>
            </button>
          </div>
          <button
            onClick={loadSummary}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg shadow-sm border border-white/10 p-4">
          <div className="text-sm font-medium text-slate-400 mb-1">Materials Inspected</div>
          <div className="text-2xl font-bold text-white">
            {summary.materials_list.length}
          </div>
          <div className="mt-2 space-y-1">
            {summary.materials_list.slice(0, 3).map((material: string, index: number) => (
              <div key={index} className="text-xs text-slate-400 truncate" title={material}>
                {material}
              </div>
            ))}
            {summary.materials_list.length > 3 && (
              <div className="text-xs text-slate-500">
                +{summary.materials_list.length - 3} more
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg shadow-sm border border-white/10 p-4">
          <div className="text-sm font-medium text-slate-400 mb-1">FRR Ratings</div>
          <div className="text-2xl font-bold text-white">
            {summary.frr_list.length}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.frr_list.map((frr: number, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-white/10 text-slate-300 rounded text-xs font-medium"
              >
                {frr} min
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg shadow-sm border border-white/10 p-4">
          <div className="text-sm font-medium text-slate-400 mb-1">Total Inspections</div>
          <div className="text-2xl font-bold text-white">
            {summary.data.inspection_stats.total_inspections}
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Completed:</span>
              <span className="font-medium text-green-400">
                {summary.data.inspection_stats.completed_inspections}
              </span>
            </div>
            {summary.data.inspection_stats.failed_inspections > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Failed:</span>
                <span className="font-medium text-red-400">
                  {summary.data.inspection_stats.failed_inspections}
                </span>
              </div>
            )}
            {summary.data.inspection_stats.draft_inspections > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Draft:</span>
                <span className="font-medium text-slate-300">
                  {summary.data.inspection_stats.draft_inspections}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Report Integration Notes
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Short summary: Recommended for report cover page</li>
              <li>• Full legal summary: Include on page 2 for compliance documentation</li>
              <li>
                • Compliance watermark will be auto-applied based on overall result
              </li>
              <li>• All data is pulled live from inspection records</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
