export default function HistoryTable({ history }) {
  if (!history || history.length === 0) {
    return (
      <section className="history">
        <h2>Analysis history</h2>
        <p className="empty-state">No analyses yet — upload a photo to get started.</p>
      </section>
    );
  }

  return (
    <section className="history">
      <h2>Analysis history</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Total waste</th>
            <th>Score</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.created_at).toLocaleDateString()}</td>
              <td>{row.total_waste}</td>
              <td>{row.pollution_score}</td>
              <td>
                <span className={`severity-badge severity-${row.severity.toLowerCase()}`}>
                  {row.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
