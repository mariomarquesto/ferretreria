export default function Table({ columns, data, loading, emptyMessage = 'Sin datos' }) {
  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`py-3 px-3 font-semibold ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={`py-3 px-3 ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}