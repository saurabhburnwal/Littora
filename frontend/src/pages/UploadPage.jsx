import { useState } from "react";
import axios from "axios";
import { ImageOff } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import UploadForm  from "../components/UploadForm.jsx";
import ResultPanel from "../components/ResultPanel.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function UploadPage() {
  const { loadStats } = useStats();
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleUpload(file, coords) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);
    if (coords) {
      formData.append("latitude",  coords.latitude);
      formData.append("longitude", coords.longitude);
    }

    try {
      const { data } = await axios.post(`${API_BASE}/api/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      loadStats(); // refresh dashboard stats globally
    } catch (err) {
      setError(
        err.response?.data?.error || "Analysis failed — is the backend running?"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Upload &amp; Analyze</h1>
        <p>Submit a beach photo to detect waste and get an instant pollution report.</p>
      </div>

      <div className="upload-layout">
        {/* Left pane — sticky upload form */}
        <div className="upload-pane">
          <div className="upload-card">
            <UploadForm onUpload={handleUpload} loading={loading} />
            {error && (
              <p className="error" style={{ marginTop: "0.85rem" }}>
                ⚠️ {error}
              </p>
            )}
          </div>
        </div>

        {/* Right pane — result or placeholder */}
        <div>
          {result ? (
            <ResultPanel result={result} />
          ) : (
            <div className="result-placeholder">
              <ImageOff size={44} strokeWidth={1.4} />
              <p>Your analysis results will appear here after you upload and analyze a photo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
