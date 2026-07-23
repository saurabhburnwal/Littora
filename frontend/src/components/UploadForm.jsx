import { useState } from "react";
import { UploadCloud } from "lucide-react";

export default function UploadForm({ onUpload, loading }) {
  const [file,       setFile]       = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragging,   setDragging]   = useState(false);
  // idle | fetching | granted | denied
  const [locStatus,  setLocStatus]  = useState("idle");

  function applyFile(selected) {
    if (!selected || !selected.type.startsWith("image/")) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setLocStatus("idle");
  }

  function handleFileChange(e)  { applyFile(e.target.files[0]); }
  function handleDragOver(e)    { e.preventDefault(); setDragging(true); }
  function handleDragLeave(e)   { e.preventDefault(); setDragging(false); }
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    if (!navigator.geolocation) {
      onUpload(file, null);
      return;
    }

    setLocStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocStatus("granted");
        onUpload(file, { latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        setLocStatus("denied");
        onUpload(file, null);
      },
      { timeout: 6000, maximumAge: 60000 }
    );
  }

  const isBusy   = loading || locStatus === "fetching";
  const btnLabel =
    locStatus === "fetching" ? "Getting location…"
    : loading               ? "Analyzing…"
    :                         "Analyze photo";

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        htmlFor="image-input"
        className={`upload-label${dragging ? " drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Selected beach photo" className="upload-preview" />
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon-wrap">
              <UploadCloud size={24} strokeWidth={1.8} />
            </div>
            <span className="upload-label-text">
              Drag &amp; drop or click to browse
            </span>
            <span className="upload-hint">JPEG · PNG · WEBP</span>
          </div>
        )}
      </label>

      <input
        id="image-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />

      <button type="submit" className="upload-btn" disabled={!file || isBusy}>
        <UploadCloud size={18} strokeWidth={2} />
        {btnLabel}
      </button>

      {locStatus === "denied" && (
        <p className="loc-note" style={{ color: "var(--muted)" }}>
          📍 Location access denied — uploaded without coordinates.
        </p>
      )}
      {locStatus === "granted" && (
        <p className="loc-note" style={{ color: "var(--teal)" }}>
          📍 Location attached to this photo.
        </p>
      )}
    </form>
  );
}
