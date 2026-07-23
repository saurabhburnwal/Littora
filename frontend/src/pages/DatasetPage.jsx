import { useState } from "react";
import { Download, Search, Filter } from "lucide-react";

const DATASETS = [
  { name: "Marina Beach — June 2026",  records: 640,  size: "12.4 MB", format: "CSV",  updated: "30 Jun 2026" },
  { name: "Juhu Beach — June 2026",    records: 523,  size: "9.8 MB",  format: "JSON", updated: "30 Jun 2026" },
  { name: "Goa Beach — June 2026",     records: 412,  size: "7.6 MB",  format: "CSV",  updated: "29 Jun 2026" },
  { name: "All Beaches — May 2026",    records: 5411, size: "98.2 MB", format: "CSV",  updated: "31 May 2026" },
  { name: "All Beaches — April 2026",  records: 4650, size: "84.5 MB", format: "CSV",  updated: "30 Apr 2026" },
  { name: "Training Dataset v2",       records: 24820,size: "2.1 GB",  format: "ZIP",  updated: "15 Jun 2026" },
];

export default function DatasetPage() {
  const [search, setSearch] = useState("");

  const filtered = DATASETS.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Dataset Explorer</h1>
        <p>Browse, filter and download waste detection datasets.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Search datasets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '260px' }}
          />
        </div>
        <button className="filter-btn filter-btn-apply" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={14} />
          Filter
        </button>
      </div>

      <div className="history">
        <table>
          <thead>
            <tr>
              <th>Dataset Name</th>
              <th>Records</th>
              <th>Size</th>
              <th>Format</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{d.name}</td>
                <td>{d.records.toLocaleString()}</td>
                <td style={{ color: 'var(--muted)' }}>{d.size}</td>
                <td>
                  <span className="waste-badge waste-plastic" style={{ background: '#f3f4f6', color: '#374151' }}>
                    {d.format}
                  </span>
                </td>
                <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{d.updated}</td>
                <td>
                  <button className="export-btn" style={{ fontSize: '0.73rem', padding: '0.3rem 0.7rem' }}>
                    <Download size={12} />
                    Export
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
