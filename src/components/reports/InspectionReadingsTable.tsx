import { format } from 'date-fns';

interface Reading {
  sequence_number: number;
  dft_average: number;
  status: string;
  created_at: string;
}

interface InspectionReadingsTableProps {
  readings: Reading[];
}

export function InspectionReadingsTable({ readings }: InspectionReadingsTableProps) {
  return (
    <div className="readings-table-container">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="py-2 px-3 text-left font-bold text-gray-700">Date & Time</th>
            <th className="py-2 px-3 text-center font-bold text-gray-700"># Reading</th>
            <th className="py-2 px-3 text-right font-bold text-gray-700">Thickness (µm)</th>
            <th className="py-2 px-3 text-center font-bold text-gray-700">Type</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading, index) => (
            <tr
              key={index}
              className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <td className="py-2 px-3 text-gray-700">
                {format(new Date(reading.created_at), 'dd/MM/yyyy HH:mm:ss')}
              </td>
              <td className="py-2 px-3 text-center text-gray-900 font-medium">
                {reading.sequence_number}
              </td>
              <td className="py-2 px-3 text-right text-gray-900 font-bold">
                {reading.dft_average.toFixed(1)}
              </td>
              <td className="py-2 px-3 text-center text-gray-600">
                {reading.status === 'pass' ? 'PASS' : reading.status === 'fail' ? 'FAIL' : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
