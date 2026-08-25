import { useState, useEffect } from "react";
import axios from "axios";
import { ImageOff } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth }  from "../context/AuthContext.jsx";
import UploadForm  from "../components/UploadForm.jsx";
import ResultPanel from "../components/ResultPanel.jsx";
import { API_BASE, DEFAULT_AI_MODELS } from "../utils/wasteUtils.js";

export default function UploadPage() {
  const { loadStats }  = useStats();
  const { getToken, isAdmin } = useAuth();
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Model state
  const [modelInfo, setModelInfo] = useState({
    activeModel: "yolov8m",
    activeModelDetails: DEFAULT_AI_MODELS[0],
    availableModels: DEFAULT_AI_MODELS,
  });
  const [updatingModel, setUpdatingModel] = useState(false);

  useEffect(() => {
    fetchModelInfo();
  }, []);

  async function fetchModelInfo() {
    try {
      const { data } = await axios.get(`${API_BASE}/api/model`);
      if (data && data.activeModel) {
        setModelInfo(data);
      }
    } catch (_) {
      // Non-fatal: fallback default modelInfo state is used
    }
  }

  async function handleUpdateModel(newModelId) {
    if (!isAdmin) return;
    setUpdatingModel(true);
    setError(null);

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.post(`${API_BASE}/api/model`, { modelId: newModelId }, { headers });
      
      if (data && data.activeModel) {
        setModelInfo((prev) => ({
          ...prev,
          activeModel: data.activeModel,
          activeModelDetails: data.activeModelDetails,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update system AI model");
    } finally {
      setUpdatingModel(false);
    }
  }

  async function handleUpload(file, coords) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);
    if (coords) {
      if (coords.latitude)  formData.append("latitude",  coords.latitude);
      if (coords.longitude) formData.append("longitude", coords.longitude);
      if (coords.locationLabel) formData.append("location_label", coords.locationLabel);
    }

    try {
      // Attach JWT so the upload is tagged with the current user's id
      const token = await getToken();
      const headers = { "Content-Type": "multipart/form-data" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const { data } = await axios.post(`${API_BASE}/api/analyze`, formData, { headers });
      setResult(data);
      loadStats();
    } catch (err) {
      setError(
        err.response?.data?.error || "Analysis failed — is the backend running?"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="page-heading mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Detect Waste</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">Upload or capture a beach photo to detect waste using AI.</p>
      </div>

      <div className={`upload-layout ${!result ? "before-analysis" : "has-result"} grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)] gap-6 items-start`}>
        {/* Left — upload form & feature image with bounding boxes */}
        <div className="upload-pane sticky top-6 z-10">
          <div className="upload-card bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-md">
            <div className="upload-card-title font-display text-sm font-bold text-text-primary mb-4 pb-2 border-b border-border/50">Upload &amp; Detection View</div>
            <UploadForm
              onUpload={handleUpload}
              loading={loading}
              result={result}
              onReset={() => setResult(null)}
              modelInfo={modelInfo}
              onUpdateModel={handleUpdateModel}
              isAdmin={isAdmin}
              updatingModel={updatingModel}
            />
            {error && (
              <p className="error error--spaced text-xs text-rose-500 font-medium mt-3">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Right — result statistics & charts */}
        <div>
          <div className="upload-card bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-md">
            <div className="upload-card-title font-display text-sm font-bold text-text-primary mb-4 pb-2 border-b border-border/50">Detection Result &amp; Analytics</div>
            {result ? (
              <ResultPanel result={result} />
            ) : (
              <div className="result-placeholder result-placeholder--transparent flex flex-col items-center justify-center p-12 text-center text-text-muted gap-3">
                <ImageOff size={44} strokeWidth={1.4} />
                <p className="text-xs sm:text-sm">Your analysis breakdown and charts will appear here after you upload and analyze a photo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
