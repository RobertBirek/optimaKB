import Pagination from './Pagination';

export default function DataTable({ columns, rows, onRowClick, className = '', page, totalPages, setPage }) {
  if (!rows?.length) return <div className="emptyInline">Brak pozycji.</div>;
  return (
    <div className={`tableWrap ${className}`}>
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id || row.namespace || row.key || row.exportDir}
              className={onRowClick ? 'clickable' : ''}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRowClick?.(row); } }}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
            >              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}
