interface InspectionReportHeaderProps {
  title?: string;
  projectName: string;
  batchName?: string;
  logoUrl?: string;
}

export function InspectionReportHeader({
  title = 'Inspection Report - Dry Film Thickness',
  projectName,
  batchName,
  logoUrl,
}: InspectionReportHeaderProps) {
  return (
    <div className="report-header">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <div className="text-sm text-gray-600">
            <div className="font-medium">Project: {projectName}</div>
            {batchName && <div>Batch: {batchName}</div>}
          </div>
        </div>
        {logoUrl && (
          <div className="flex-shrink-0">
            <img src={logoUrl} alt="Company Logo" className="h-16 object-contain" />
          </div>
        )}
      </div>
      <div className="border-b-2 border-gray-300 mb-4"></div>
    </div>
  );
}
