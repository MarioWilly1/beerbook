import React, { useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { PRESET_AVATARS } from "../utils/avatarPresets";
import Avatar from "./Avatar";

// Compresses an image file to JPEG, capped at maxDimension px on the longest side.
function compressImage(file, maxDimension = 800, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width  = maxDimension;
        } else {
          width  = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    };
    img.src = objectUrl;
  });
}

const AvatarSelector = ({ profile, session, onSave, onClose }) => {
  const fileInputRef = useRef(null);
  const [file, setFile]           = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar 5 MB.");
      return;
    }
    setError("");
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !session) return;
    setUploading(true);
    setError("");

    const path = `${session.user.id}/avatar`;

    const compressed = await compressImage(file);

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });

    if (uploadErr) {
      setError("Error al subir la foto. Intentá de nuevo.");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const urlWithTs = `${publicUrl}?t=${Date.now()}`;

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: urlWithTs })
      .eq("id", session.user.id);

    if (dbErr) {
      setError("Error al guardar. Intentá de nuevo.");
      setUploading(false);
      return;
    }

    onSave(urlWithTs);
    onClose();
  };

  const handlePreset = async (preset) => {
    if (uploading) return;
    setUploading(true);
    setError("");

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: preset.url })
      .eq("id", session.user.id);

    if (dbErr) {
      setError("Error al guardar. Intentá de nuevo.");
      setUploading(false);
      return;
    }

    onSave(preset.url);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111" }}>Tu avatar</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Current avatar preview */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Avatar
            avatarUrl={previewUrl || profile?.avatar_url}
            nombre={profile?.nombre}
            size={80}
          />
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {/* Upload section */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>📁 Subir foto propia</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {!file ? (
            <button
              onClick={() => fileInputRef.current.click()}
              style={uploadBtnStyle}
            >
              Elegir foto · máx. 5 MB
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.name}
              </span>
              <button
                onClick={() => { setFile(null); setPreviewUrl(null); }}
                style={clearBtnStyle}
              >
                ✕
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{ ...saveBtnStyle, opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? "Guardando..." : "💾 Guardar"}
              </button>
            </div>
          )}
        </div>

        {/* Preset section */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>🎨 Elegir personaje</p>
          <div style={gridStyle}>
            {PRESET_AVATARS.map((preset) => {
              const isSelected = profile?.avatar_url === preset.url;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePreset(preset)}
                  disabled={uploading}
                  title={preset.nombre}
                  style={{
                    ...presetBtnStyle,
                    border:      isSelected ? "2px solid #d4af37" : "2px solid transparent",
                    background:  isSelected ? "#fffbee"           : "#f4f4f4",
                    opacity:     uploading ? 0.6 : 1,
                  }}
                >
                  <img
                    src={preset.url}
                    alt={preset.nombre}
                    style={{ width: 52, height: 52, borderRadius: "50%" }}
                  />
                  <span style={{ fontSize: 9, color: "#555", marginTop: 4, textAlign: "center", lineHeight: 1.2 }}>
                    {preset.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 9999, padding: 20,
};
const modalStyle = {
  background: "#fff", borderRadius: 16, padding: 24,
  width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
};
const closeBtnStyle = {
  background: "none", border: "none", fontSize: 20, cursor: "pointer",
  color: "#888", lineHeight: 1, padding: "2px 6px",
};
const sectionStyle = {
  background: "#fafafa", border: "1px solid #eee", borderRadius: 10,
  padding: "14px 16px", marginBottom: 16,
};
const sectionTitleStyle = {
  margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#555",
  textTransform: "uppercase", letterSpacing: "0.5px",
};
const uploadBtnStyle = {
  width: "100%", padding: 10, background: "#f0f0f0",
  border: "1.5px dashed #ccc", borderRadius: 8,
  fontSize: 13, color: "#555", cursor: "pointer", fontWeight: 600,
};
const saveBtnStyle = {
  padding: "8px 14px", background: "#d4af37", color: "#111",
  border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13,
  cursor: "pointer", whiteSpace: "nowrap",
};
const clearBtnStyle = {
  padding: "4px 8px", background: "#fee", border: "none",
  borderRadius: 6, color: "#c0392b", cursor: "pointer", fontSize: 13, fontWeight: 600,
};
const gridStyle = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
};
const presetBtnStyle = {
  display: "flex", flexDirection: "column", alignItems: "center",
  padding: "8px 4px", borderRadius: 10, cursor: "pointer",
  transition: "all 0.15s",
};
const errorStyle = {
  background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8,
  padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c0392b",
};

export default AvatarSelector;
