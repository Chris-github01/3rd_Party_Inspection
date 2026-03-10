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
      {logoUrl && (
        <div className="flex justify-center mb-8">
          <img src={logoUrl} alt="Company Logo" className="h-20 object-contain" />
        </div>
      )}
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">{title}</h1>
        <div className="text-sm text-gray-600">
          <div className="font-medium">Project: {projectName}</div>
          {batchName && <div>Batch: {batchName}</div>}
        </div>
      </div>
      <div className="border-b-2 border-gray-300 mb-4"></div>
    </div>
  );
}
