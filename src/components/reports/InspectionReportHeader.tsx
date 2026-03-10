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
    <div className="report-header flex flex-col items-center">
      {logoUrl && (
        <div className="mb-4 w-full flex justify-center">
          <img src={logoUrl} alt="Company Logo" className="h-16 object-contain" />
        </div>
      )}
      <div className="mb-6 w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <div className="text-sm text-gray-600">
          <div className="font-medium">Project: {projectName}</div>
          {batchName && <div>Batch: {batchName}</div>}
        </div>
      </div>
      <div className="border-b-2 border-gray-300 mb-4 w-full"></div>
    </div>
  );
}
