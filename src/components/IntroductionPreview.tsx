import { useState, useEffect } from 'react';
import { FileText, Download, Loader2, Copy, Building2, CheckCircle } from 'lucide-react';
import { generateIntroduction } from '../lib/introductionGenerator';
import { generateStandaloneIntroductionPDF } from '../lib/pdfIntroduction';

interface IntroductionPreviewProps {
  projectId: string;
}

export function IntroductionPreview({ projectId }: IntroductionPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [introduction, setIntroduction] = useState<any>(null);
  const [activeView, setActiveView] = useState<'short' | 'full'>('full');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadIntroduction();
  }, [projectId]);

  const loadIntroduction = async () => {
    setLoading(true);
    try {
      const result = await generateIntroduction(projectId);
      setIntroduction(result);
    } catch (error) {
      console.error('Error generating introduction:', error);
      alert('Failed to generate introduction');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy =
      activeView === 'short'
        ? introduction.short_introduction_text
        : introduction.full_introduction_text;

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
      await generateStandaloneIntroductionPDF(
        projectId,
        `Introduction_${introduction.data.project.project_name.replace(/\s+/g, '_')}.pdf`
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
        <span className="ml-3 text-slate-600">Generating introduction...</span>
      </div>
    );
  }

  if (!introduction) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600">No introduction data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Report Introduction</h3>
              <p className="text-sm text-slate-600 mt-1">
                Auto-generated from project and company data
              </p>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
              <Building2 className="w-5 h-5" />
              <span className="font-semibold">{introduction.data.company.company_name}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('full')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'full'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Full Introduction
            </button>
            <button
              onClick={() => setActiveView('short')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'short'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Short Version
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <pre className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed">
              {activeView === 'short'
                ? introduction.short_introduction_text
                : introduction.full_introduction_text}
            </pre>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex space-x-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
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
            onClick={loadIntroduction}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-600 mb-1">Inspection Period</div>
          <div className="text-lg font-bold text-slate-900">
            {introduction.inspection_date_range}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-600 mb-1">System Types</div>
          <div className="mt-2 space-y-1">
            {introduction.scope_flags.has_intumescent && (
              <div className="flex items-center text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Intumescent</span>
              </div>
            )}
            {introduction.scope_flags.has_cementitious && (
              <div className="flex items-center text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Cementitious</span>
              </div>
            )}
            {introduction.scope_flags.has_board && (
              <div className="flex items-center text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Board Systems</span>
              </div>
            )}
            {!introduction.scope_flags.has_intumescent &&
              !introduction.scope_flags.has_cementitious &&
              !introduction.scope_flags.has_board && (
                <div className="text-sm text-slate-500">No systems detected</div>
              )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-600 mb-1">Client</div>
          <div className="text-lg font-bold text-slate-900 truncate" title={introduction.data.client.client_name}>
            {introduction.data.client.client_name}
          </div>
          {introduction.data.client.contact_name && (
            <div className="text-xs text-slate-600 mt-1">
              Contact: {introduction.data.client.contact_name}
            </div>
          )}
        </div>
      </div>

      {introduction.data.blocks_levels &&
        (introduction.data.blocks_levels.blocks?.length > 0 ||
          introduction.data.blocks_levels.levels?.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-sm font-medium text-slate-700 mb-3">Project Areas</div>
            <div className="grid grid-cols-2 gap-4">
              {introduction.data.blocks_levels.blocks?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-2">Blocks</div>
                  <div className="flex flex-wrap gap-2">
                    {introduction.data.blocks_levels.blocks.map((block: any) => (
                      <span
                        key={block.id}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                      >
                        {block.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {introduction.data.blocks_levels.levels?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-2">Levels</div>
                  <div className="flex flex-wrap gap-2">
                    {introduction.data.blocks_levels.levels.map((level: any) => (
                      <span
                        key={level.id}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                      >
                        {level.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Report Integration Notes
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Full introduction: Include after Executive Summary in main report</li>
              <li>• Short version: Optional for quick reference documents</li>
              <li>• Company branding is pulled from company settings</li>
              <li>• Scope adapts automatically based on materials used</li>
              <li>
                • All data is pulled live from project, client, and inspection records
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
