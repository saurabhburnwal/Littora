import { useState } from "react";

export default function UploadForm({ onUpload, loading }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    onUpload(file);
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label htmlFor="image-input" className="upload-label">
        {previewUrl ? (
          <img src={previewUrl} alt="Selected beach photo" className="upload-preview" />
        ) : (
          <span>Choose a beach photo</span>
        )}
      </label>
      <input
        id="image-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />
      <button type="submit" disabled={!file || loading}>
        {loading ? "Analyzing..." : "Analyze photo"}
      </button>
    </form>
  );
}
