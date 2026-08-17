import React, { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat } from "@zxing/library";
import { useBeers } from "../hooks/useBeers";
import { useUserBeers } from "../hooks/useUserBeers";
import { supabase } from "../services/supabase";
import { compressImage, uploadUserBeerPhoto } from "../utils/photoUpload";
import { hashToString } from "../utils/perceptualHash";
import { insertTasting } from "../utils/tastings";
import { registerFirstTasting } from "../utils/registerBeer";
import { logActivity } from "../utils/activity";
import { toastSave } from "../utils/toast";
import { soundClink } from "../utils/sounds";
import BeerAutocomplete from "./BeerAutocomplete";
import SuggestBeerModal from "./SuggestBeerModal";
import VolumeSelector from "./VolumeSelector";
import { XIcon, DeviceCameraIcon, SearchIcon } from "@primer/octicons-react";

// Registro rápido de una cerveza nueva (Fase G): abre la cámara directo,
// intenta identificar la cerveza por su código de barras en la foto
// (reutilizando @zxing/browser tal como BarcodeScanner.jsx, pero sobre una
// imagen ya capturada en vez de un stream en vivo), y si no puede cae a un
// buscador por nombre con la foto ya adjunta. Al confirmar, guarda la
// primera cata vía registerFirstTasting — mismo patrón/tablas que
// QuickTastingModal usa para las re-catas, así que ambas aparecen juntas en
// la galería de historial de Mi Cuaderno sin ningún cambio ahí.
const QuickRegisterModal = ({ onClose }) => {
  const { t } = useTranslation();
  const { beers } = useBeers();
  const { userBeers } = useUserBeers();
  const isNative = Capacitor.isNativePlatform();

  const [phase, setPhase] = useState("init"); // init | search | confirm | saving
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoHash, setPhotoHash] = useState(undefined);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedBeer, setSelectedBeer] = useState(null);
  const [comment, setComment] = useState("");
  const [cantidadMl, setCantidadMl] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isNative) attemptNativeCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attemptNativeCamera = async () => {
    try {
      const { Camera, CameraResultType, CameraSource, CameraDirection } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri, source: CameraSource.Camera,
        direction: CameraDirection.Rear, quality: 90,
      });
      const res = await fetch(photo.webPath);
      const blob = await res.blob();
      await handlePhotoCaptured(blob);
    } catch {
      // Cancelado o sin permiso de cámara — cae al buscador por nombre.
      setPhase("search");
    }
  };

  const handleWebFile = (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    handlePhotoCaptured(file);
  };

  const handlePhotoCaptured = async (fileOrBlob) => {
    setError("");
    const { blob, hash } = await compressImage(fileOrBlob);
    setPhotoBlob(blob);
    setPhotoHash(hash);
    setPhotoPreview(URL.createObjectURL(blob));

    try {
      const reader = new BrowserMultiFormatReader();
      reader.possibleFormats = [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      ];
      const img = new Image();
      const loaded = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.src = URL.createObjectURL(blob);
      await loaded;
      const result = await reader.decodeFromImageElement(img);
      const code = result.getText();
      const match = beers.find((b) => b.codigo_barras === code);
      if (match) {
        setSelectedBeer(match);
        setPhase("confirm");
        return;
      }
    } catch {
      // No se detectó código de barras en la foto — sigue al buscador,
      // con la foto ya adjunta esperando confirmación.
    }
    setPhase("search");
  };

  const handleSelectBeer = (beer) => {
    setSelectedBeer(beer);
    setPhase("confirm");
  };

  const alreadyOwned = selectedBeer && userBeers.some((u) => u.beer_id === selectedBeer.id);

  const handleConfirm = async () => {
    setPhase("saving");
    setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError(t("quickRegister.saveError")); setPhase("confirm"); return; }

    let photoUrl = "";
    let hashStr;
    if (photoBlob) {
      photoUrl = await uploadUserBeerPhoto(supabase, session.user.id, selectedBeer.nombre, selectedBeer.id, photoBlob);
      hashStr = hashToString(photoHash);
    }

    const trimmedComment = comment.trim();

    if (alreadyOwned) {
      // Ya está en el cuaderno — esto es una re-cata liviana (mismo patrón
      // que MiCuaderno.js usa para QuickTastingModal), no toca el rating ni
      // la foto que ya tenía guardados salvo lo que esta cata trae (foto y/o
      // comentario nuevos, que quedan como los más recientes en la ficha).
      const { error: tastingError } = await insertTasting(supabase, session.user.id, selectedBeer.id, {
        comment: trimmedComment || null,
        user_photo_url: photoUrl || null,
        cantidad_ml: cantidadMl || null,
        ...(hashStr !== undefined ? { photo_hash: hashStr } : {}),
      });
      if (tastingError) { setError(t("quickRegister.saveError")); setPhase("confirm"); return; }
      await logActivity(session.user.id, selectedBeer.id, { comment: trimmedComment, photo: photoUrl });
      soundClink();
      toastSave(3, false);
      onClose();
      return;
    }

    const result = await registerFirstTasting(supabase, selectedBeer, { photoUrl, photoHash: hashStr, comment: trimmedComment, cantidadMl });
    if (result.error) { setError(t("quickRegister.saveError")); setPhase("confirm"); return; }
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={phase === "saving" ? undefined : onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0, flex: 1, fontFamily: "'Playfair Display', serif", color: "#f0e4cc", fontSize: 19 }}>
            🍺 {t("quickRegister.title")}
          </h2>
          {phase !== "saving" && (
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a4535", cursor: "pointer", lineHeight: 1, display: "flex" }}>
              <XIcon size={20} />
            </button>
          )}
        </div>

        {phase === "init" && !isNative && (
          <div>
            <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 18px", lineHeight: 1.5 }}>
              {t("quickRegister.introSubtitle")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleWebFile}
              style={{ display: "none" }}
            />
            <button onClick={() => fileInputRef.current?.click()} style={primaryBtnStyle}>
              <DeviceCameraIcon size={16} /> {t("quickRegister.takePhotoBtn")}
            </button>
            <button onClick={() => setPhase("search")} style={secondaryLinkStyle}>
              <SearchIcon size={13} /> {t("quickRegister.searchInsteadBtn")}
            </button>
          </div>
        )}

        {phase === "init" && isNative && (
          <p style={{ color: "#9a7d62", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            {t("quickRegister.openingCamera")}
          </p>
        )}

        {phase === "search" && (
          <div>
            {photoPreview && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <img src={photoPreview} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: "#9a7d62", lineHeight: 1.4 }}>
                  {t("quickRegister.photoAttachedHint")}
                </p>
              </div>
            )}
            <BeerAutocomplete
              beers={beers}
              onSelect={handleSelectBeer}
              placeholder={t("quickRegister.searchPlaceholder")}
              autoFocus
            />
            <button
              onClick={() => setShowSuggest(true)}
              style={secondaryLinkStyle}
            >
              {t("quickRegister.notFoundBtn")}
            </button>
          </div>
        )}

        {(phase === "confirm" || phase === "saving") && selectedBeer && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              {photoPreview ? (
                <img src={photoPreview} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              ) : selectedBeer.foto_url ? (
                <img src={selectedBeer.foto_url} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              ) : null}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#f0e4cc" }}>{selectedBeer.nombre}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9a7d62" }}>{selectedBeer.estilo}</p>
              </div>
            </div>

            {alreadyOwned && (
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "#c07a3f", lineHeight: 1.5 }}>
                {t("quickRegister.alreadyOwnedHint")}
              </p>
            )}

            {phase !== "saving" && (
              <div style={{ marginBottom: 14 }}>
                <VolumeSelector value={cantidadMl} onChange={setCantidadMl} />
              </div>
            )}

            {phase !== "saving" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9a7d62", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 }}>
                  {t("quickRegister.commentLabel")}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 400))}
                  placeholder={t("quickRegister.commentPlaceholder")}
                  rows={2}
                  maxLength={400}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: "#0d0a06", border: "1px solid #2e2215", color: "#f0e4cc",
                    fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none",
                    fontFamily: "Inter, sans-serif",
                  }}
                  spellCheck="true"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                />
              </div>
            )}

            {error && <p style={{ margin: "0 0 14px", fontSize: 12, color: "#c07a3f" }}>{error}</p>}

            <button onClick={handleConfirm} disabled={phase === "saving"} style={{ ...primaryBtnStyle, opacity: phase === "saving" ? 0.6 : 1 }}>
              {phase === "saving" ? t("quickRegister.saving") : t("quickRegister.confirmBtn")}
            </button>
            {phase !== "saving" && (
              <button onClick={() => { setSelectedBeer(null); setComment(""); setPhase("search"); }} style={secondaryLinkStyle}>
                {t("quickRegister.backBtn")}
              </button>
            )}
          </div>
        )}
      </div>

      {showSuggest && (
        <SuggestBeerModal onClose={() => setShowSuggest(false)} t={t} />
      )}
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 100000, padding: 16,
};
const modalStyle = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: 28, width: "100%", maxWidth: 420,
};
const primaryBtnStyle = {
  width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const secondaryLinkStyle = {
  width: "100%", marginTop: 12, padding: "8px 0", background: "none", border: "none",
  color: "#8b6b2e", fontSize: 13, fontWeight: 600, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  textDecoration: "underline", textDecorationColor: "#5a4535",
};

export default QuickRegisterModal;
