import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DeviceCameraIcon, XIcon } from "@primer/octicons-react";
import { supabase } from "../services/supabase";
import { compressImage, uploadUserBeerPhoto } from "../utils/photoUpload";
import { hashToString } from "../utils/perceptualHash";
import VolumeSelector from "./VolumeSelector";

const COMMENT_MAX = 140;

// Formulario compacto para registrar una re-cata (botón "+" de
// QuickTastingWidget) — reemplaza el insert en blanco de antes. Pide foto
// y comentario (ambos obligatorios); la Puntuación NO se pide acá, sigue
// siendo un campo a nivel de la cerveza, editable desde el formulario
// completo (ver migración 20260810000000, que blindó esto para que la cata
// rápida ya no la pise). Reutiliza el mismo <input type="file"> y el mismo
// pipeline de compresión/hash que el resto de la app — la detección de
// fotos duplicadas y el XP de re-cata (+3) ya cubren cualquier insert en
// beer_tastings, sin necesitar nada especial acá.
const QuickTastingModal = ({ beer, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [photoFile, setPhotoFile]       = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [comment, setComment]           = useState("");
  const [cantidadMl, setCantidadMl]     = useState(null);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const fileInputRef = useRef(null);

  const canSave = !!photoFile && comment.trim().length > 0 && !saving;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");

      const { blob, hash } = await compressImage(photoFile);
      const photoUrl = await uploadUserBeerPhoto(supabase, session.user.id, beer.nombre, beer.id, blob);

      await onSaved({
        userId: session.user.id,
        user_photo_url: photoUrl,
        photo_hash: hashToString(hash),
        comment: comment.trim(),
        cantidad_ml: cantidadMl || null,
      });
    } catch {
      setError(t("quickTasting.error"));
      setSaving(false);
    }
  };

  return (
    <div onClick={saving ? undefined : onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        <div style={headerRowStyle}>
          <div>
            <p style={titleStyle}>{t("quickTasting.title")}</p>
            <p style={beerNameStyle}>{beer.nombre}</p>
          </div>
          {!saving && (
            <button onClick={onClose} style={closeBtnStyle}>
              <XIcon size={16} />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
          style={photoBtnStyle}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="" style={photoPreviewImgStyle} />
          ) : (
            <>
              <DeviceCameraIcon size={22} />
              <span>{t("quickTasting.photoPlaceholder")}</span>
            </>
          )}
        </button>

        <div style={{ marginBottom: 12 }}>
          <VolumeSelector value={cantidadMl} onChange={setCantidadMl} />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
          maxLength={COMMENT_MAX}
          rows={2}
          placeholder={t("quickTasting.commentPlaceholder")}
          disabled={saving}
          style={textareaStyle}
        />
        <div style={counterStyle}>{comment.length}/{COMMENT_MAX}</div>

        {error && <p style={errorStyle}>{error}</p>}

        <button onClick={handleSave} disabled={!canSave} style={{ ...saveBtnStyle, opacity: canSave ? 1 : 0.5 }}>
          {saving ? t("quickTasting.saving") : t("quickTasting.saveBtn")}
        </button>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(5,4,3,0.82)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
  zIndex: 3000,
};
const cardStyle = {
  width: "100%", maxWidth: 420,
  background: "#150f08", border: "1px solid #2e2215", borderRadius: "18px 18px 0 0",
  padding: 20, boxSizing: "border-box",
};
const headerRowStyle = {
  display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14,
};
const titleStyle = { margin: 0, fontSize: 16, fontWeight: 700, color: "#f0e4cc" };
const beerNameStyle = { margin: "2px 0 0", fontSize: 13, color: "#9a7d62" };
const closeBtnStyle = {
  background: "none", border: "none", color: "#9a7d62", cursor: "pointer", display: "flex", padding: 4,
};
const photoBtnStyle = {
  width: "100%", minHeight: 120, borderRadius: 12,
  border: "1.5px dashed #2e2215", background: "#1c1409", color: "#9a7d62",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
  fontSize: 13, cursor: "pointer", marginBottom: 12, overflow: "hidden", padding: 0,
};
const photoPreviewImgStyle = {
  width: "100%", height: 160, objectFit: "cover", display: "block",
};
const textareaStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid #2e2215", background: "#1c1409", color: "#f0e4cc",
  fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box",
};
const counterStyle = {
  textAlign: "right", fontSize: 11, color: "#5a4535", margin: "4px 0 14px",
};
const errorStyle = {
  color: "#c07a3f", fontSize: 12, margin: "0 0 10px",
};
const saveBtnStyle = {
  width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
  background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

export default QuickTastingModal;
