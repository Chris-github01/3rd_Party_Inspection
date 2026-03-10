interface MetadataItem {
  label: string;
  value: string | number;
}

interface MetadataPanelProps {
  title: string;
  items: MetadataItem[];
  className?: string;
}

export function MetadataPanel({ title, items, className = '' }: MetadataPanelProps) {
  return (
    <div className={`metadata-panel bg-white border border-gray-200 rounded shadow-sm ${className}`}>
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-2">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-3">
        <table className="w-full text-xs">
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="py-1.5 px-2 font-medium text-gray-600 w-2/5">{item.label}:</td>
                <td className="py-1.5 px-2 text-gray-900">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
