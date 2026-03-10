interface StatisticsTableProps {
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
}

export function StatisticsTable({ stats }: StatisticsTableProps) {
  const items = [
    { label: '# Readings', value: stats.count },
    { label: 'Mean', value: `${stats.mean.toFixed(1)} µm` },
    { label: 'Maximum', value: `${stats.max} µm` },
    { label: 'Minimum', value: `${stats.min} µm` },
    { label: 'Range', value: `${stats.range} µm` },
    { label: 'Std Deviation (σ)', value: `${stats.standardDeviation.toFixed(1)} µm` },
  ];

  if (stats.meanPlus3Sigma !== undefined) {
    items.push({ label: 'Mean + 3σ', value: `${stats.meanPlus3Sigma.toFixed(1)} µm` });
  }

  items.push(
    { label: 'Mean - 3σ', value: `${stats.meanMinus3Sigma.toFixed(1)} µm` },
    { label: 'COV%', value: `${stats.covPercent.toFixed(1)}%` }
  );

  return (
    <div className="metadata-panel bg-white border border-gray-200 rounded shadow-sm">
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-2">
        <h3 className="text-sm font-bold text-gray-800">Statistics</h3>
      </div>
      <div className="p-3">
        <table className="w-full text-xs">
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="py-1.5 px-2 font-medium text-gray-600 w-2/5">{item.label}:</td>
                <td className="py-1.5 px-2 text-gray-900 text-right">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
