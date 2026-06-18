import { useState, useEffect, useCallback } from "react";
import axios from "axios";

import UploadForm from "./components/UploadForm.jsx";
import ResultPanel from "./components/ResultPanel.jsx";
import HistoryTable from "./components/HistoryTable.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function App() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/analyses`);
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleUpload(file) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const { data } = await axios.post(`${API_BASE}/api/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Beach Waste Monitor</h1>
        <p>Upload a beach photo to detect waste and track pollution over time.</p>
      </header>

      <UploadForm onUpload={handleUpload} loading={loading} />

      {error && <p className="error">{error}</p>}

      {result && <ResultPanel result={result} />}

      <HistoryTable history={history} />
    </main>
  );
}
