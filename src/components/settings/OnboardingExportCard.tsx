import { useState } from 'react';
import { FileDown, FileText, File, Check, X } from 'lucide-react';
import { exportOnboardingPackPdf } from '../../lib/exports/exportOnboardingPackPdf';
import { exportOnboardingPackDocx } from '../../lib/exports/exportOnboardingPackDocx';

interface OnboardingExportCardProps {
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
    onboarding_config: any;
  };
}

export function OnboardingExportCard({ organization }: OnboardingExportCardProps) {
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      await exportOnboardingPackPdf(organization);
      showMessage('PDF onboarding pack exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showMessage('Failed to export PDF onboarding pack', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocx = async () => {
    setExporting('docx');
    try {
      await exportOnboardingPackDocx(organization);
      showMessage('DOCX onboarding pack exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      showMessage('Failed to export DOCX onboarding pack', 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-6">
      <div className="flex items-center mb-4">
        <FileDown className="w-5 h-5 text-primary-600 mr-2" />
        <h2 className="text-lg font-semibold text-primary-900">Export Onboarding Pack</h2>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 mr-2 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 mr-2 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <p className="text-sm text-primary-600 mb-6">
        Generate a professional VerifyTrade Client Onboarding Pack including subscription agreement, direct debit authority and organisation setup forms.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF Export */}
        <div className="border border-primary-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <FileText className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-900">PDF Pack</h3>
              <p className="text-sm text-primary-600">Portable Document Format</p>
            </div>
          </div>
          <p className="text-sm text-primary-700 mb-4">
            Professional PDF document suitable for printing and digital distribution.
          </p>
          <button
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4 mr-2" />
            {exporting === 'pdf' ? 'Exporting...' : 'Export PDF Pack'}
          </button>
        </div>

        {/* DOCX Export */}
        <div className="border border-primary-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <File className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-900">DOCX Pack</h3>
              <p className="text-sm text-primary-600">Microsoft Word Document</p>
            </div>
          </div>
          <p className="text-sm text-primary-700 mb-4">
            Editable Word document that can be customized before sending.
          </p>
          <button
            onClick={handleExportDocx}
            disabled={exporting !== null}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <File className="w-4 h-4 mr-2" />
            {exporting === 'docx' ? 'Exporting...' : 'Export DOCX Pack'}
          </button>
        </div>
      </div>

      {/* Export Information */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2 text-sm">Exported Content Includes:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>Organisation branding and logo (if uploaded)</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>All enabled sections from configuration</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>Fillable fields for client information</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>Professional formatting and layout</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
