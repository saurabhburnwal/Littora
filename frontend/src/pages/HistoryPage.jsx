import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import PhotoGallery from "../components/PhotoGallery.jsx";
import HistoryTable from "../components/HistoryTable.jsx";

const SEVERITIES = ["All", "Low", "Moderate", "High", "Severe"];

export default function HistoryPage() {
  const { stats } = useStats();
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Robust case-insensitive filter state shared by both gallery and table
  const filtered = useMemo(() => {
    const list = stats?.history || [];
    const query = searchQuery.trim().toLowerCase();

    return list.filter((r) => {
      const itemSeverity = (r.severity || "").toString().trim().toLowerCase();
      const matchesSeverity =
        filter === "All" || itemSeverity === filter.toLowerCase();

      const matchesSearch =
        !query ||
        (r.location_label &&
          r.location_label.toLowerCase().includes(query)) ||
        (r.severity && r.severity.toLowerCase().includes(query));

      return matchesSeverity && matchesSearch;
    });
  }, [stats?.history, filter, searchQuery]);

  const countLabel =
    filter === "All" && !searchQuery.trim()
      ? `${filtered.length} total analyses`
      : `${filtered.length} matching analyses`;

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>History</h1>
        <p>Browse all analyzed photos and review detailed detection reports.</p>
      </div>

      {/* Shared filter & search controls — applies to both gallery and table */}
      <div className="history-controls">
        <p className="section-title" style={{ margin: 0 }}>
          {countLabel}
        </p>
        <div className="history-filters-wrap">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              aria-label="Search location or severity"
              className="search-input"
              placeholder="Search location or severity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-bar">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                className={`filter-pill${filter === s ? " active" : ""}`}
                onClick={() => setFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Photo gallery — visual card grid */}
      <section style={{ marginBottom: "0.5rem" }}>
        <p className="section-title">Photo Gallery</p>
        <PhotoGallery items={filtered} />
      </section>

      {/* Detailed records table — sortable + paginated */}
      <section>
        <p className="section-title">Detailed Records</p>
        <HistoryTable history={filtered} />
      </section>
    </div>
  );
}

