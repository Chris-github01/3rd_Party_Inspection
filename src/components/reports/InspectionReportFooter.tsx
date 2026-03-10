import { format } from 'date-fns';

interface InspectionReportFooterProps {
  companyName?: string;
  pageNumber?: number;
  totalPages?: number;
}

export function InspectionReportFooter({
  companyName,
  pageNumber,
  totalPages,
}: InspectionReportFooterProps) {
  return (
    <div className="report-footer">
      <div className="border-t border-gray-300 pt-3 flex justify-between items-center text-xs text-gray-600">
        <div>{companyName || 'Fire Protection Inspection System'}</div>
        <div className="flex gap-4">
          <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
          {pageNumber && totalPages && (
            <span>Page {pageNumber} of {totalPages}</span>
          )}
        </div>
      </div>
    </div>
  );
}
