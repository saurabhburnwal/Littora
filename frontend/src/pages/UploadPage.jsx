import { useState, useEffect } from "react";
import axios from "axios";
import { ImageOff } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth }  from "../context/AuthContext.jsx";
import UploadForm  from "../components/UploadForm.jsx";
import ResultPanel from "../components/ResultPanel.jsx";
import AuthRequiredModal from "../components/AuthRequiredModal.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@littora.app";

export default function UploadPage() {
  const { loadStats }  = useStats();
  const { user, getToken } = useAuth();
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Model state
  const [modelInfo, setModelInfo] = useState({
    activeModel: "yolov8m",
    activeModelDetails: { name: "YOLOv8 Medium", tag: "Standard Baseline", description: "Balanced speed & precision for general coastal debris detection.", badge: "Default" },
    availableModels: [
      { id: "yolov8m", name: "YOLOv8 Medium", tag: "Standard Baseline", params: "25.9M", description: "Balanced speed & precision for general coastal debris detection.", badge: "Default" },
      { id: "yolov11m", name: "YOLOv11 Medium", tag: "Enhanced Accuracy", params: "20.1M", description: "Enhanced feature extraction & attention mechanisms for complex or occluded waste.", badge: "High Precision" },
      { id: "yolov26s", name: "YOLOv26 Small", tag: "Ultra-Fast Edge", params: "9.6M", description: "Lightweight, low-latency inference optimized for real-time mobile & drone feeds.", badge: "Fastest" },
    ],
  });
  const [updatingModel, setUpdatingModel] = useState(false);

  const isAdmin = user && user.email === ADMIN_EMAIL;

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
    if (!user) {
      setShowAuthModal(true);
      return;
    }

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
    <div className="page-container">
      <div className="page-heading">
        <h1>Detect Waste</h1>
        <p>Upload or capture a beach photo to detect waste using AI.</p>
      </div>

      <div className="upload-layout">
        {/* Left — upload form & feature image with bounding boxes */}
        <div className="upload-pane">
          <div className="upload-card">
            <div className="upload-card-title">Upload &amp; Detection View</div>
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
              <p className="error" style={{ marginTop: "0.85rem" }}>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Right — result statistics & charts */}
        <div>
          <div className="upload-card">
            <div className="upload-card-title">Detection Result &amp; Analytics</div>
            {result ? (
              <ResultPanel result={result} />
            ) : (
              <div className="result-placeholder" style={{ boxShadow: 'none', background: 'transparent', padding: '3rem 1rem' }}>
                <ImageOff size={44} strokeWidth={1.4} />
                <p>Your analysis breakdown and charts will appear here after you upload and analyze a photo.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        featureName="run AI waste detection on beach photos"
      />
    </div>
  );
}
