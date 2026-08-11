import React, { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import { compressImage, uploadUserBeerPhoto } from "../utils/photoUpload";
import { hashToString } from "../utils/perceptualHash";
import { supabase } from "../services/supabase";
import { XIcon, DeviceCameraIcon } from "@primer/octicons-react";

// Verificación Reforzada (Fase F2): captura secuencial estilo BeReal —
// primero la cerveza, inmediatamente después una selfie — ambas tomadas en
// el mismo flujo continuo, sin poder elegir fotos viejas de la galería. En
// web usa <input capture> (cámara trasera, luego frontal); en nativo usa
// @capacitor/camera directo. Mismo resultado final en las dos plataformas:
// { photoUrl, photoHash, selfiePhotoUrl, selfiePhotoHash } vía onComplete.
const DualPhotoVerification = ({ beerNombre, beerId, onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState("beer"); // beer | selfie | uploading
  const [beerPreview, setBeerPreview] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const beerDataRef = useRef(null); // { blob, hash }

  const isNative = Capacitor.isNativePlatform();

  const captureNativePhoto = async (direction) => {
    const { Camera, CameraResultType, CameraSource, CameraDirection } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      direction: direction === "beer" ? CameraDirection.Rear : CameraDirection.Front,
      quality: 90,
    });
    const res = await fetch(photo.webPath);
    return res.blob();
  };

  const processCaptured = async (blobOrFile) => {
    setError("");
    try {
      const { blob, hash } = await compressImage(blobOrFile);
      if (step === "beer") {
        beerDataRef.current = { blob, hash };
        setBeerPreview(URL.createObjectURL(blob));
        setStep("selfie");
        return;
      }
      // step === "selfie": ya tenemos las dos capturas, subir y cerrar.
      setStep("uploading");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      const [photoUrl, selfiePhotoUrl] = await Promise.all([
        uploadUserBeerPhoto(supabase, session.user.id, beerNombre, beerId, beerDataRef.current.blob),
        uploadUserBeerPhoto(supabase, session.user.id, beerNombre, beerId, blob),
      ]);
      onComplete({
        photoUrl, photoHash: hashToString(beerDataRef.current.hash),
        selfiePhotoUrl, selfiePhotoHash: hashToString(hash),
      });
    } catch {
      setError(t("dualVerify.error"));
      setStep((s) => (s === "uploading" ? "selfie" : s));
    }
  };

  const handleWebFile = (e) => {
    const file = e.target.files?.[0];
    if (file) processCaptured(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCaptureClick = async () => {
    if (!isNative) { fileInputRef.current?.click(); return; }
    try {
      const blob = await captureNativePhoto(step);
      processCaptured(blob);
    } catch {
      // Usuario canceló la cámara nativa — no es un error, solo no avanza.
    }
  };

  const stepTitle = step === "beer" ? t("dualVerify.step1Title")
    : step === "selfie" ? t("dualVerify.step2Title")
    : t("dualVerify.uploading");
  const stepSubtitle = step === "beer" ? t("dualVerify.step1Subtitle")
    : step === "selfie" ? t("dualVerify.step2Subtitle") : "";

  return (
    <div style={overlayStyle} onClick={step === "uploading" ? undefined : onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0, flex: 1, fontFamily: "'Playfair Display', serif", color: "#f0e4cc", fontSize: 19 }}>
            🛡️ {t("dualVerify.title")}
          </h2>
          {step !== "uploading" && (
            <button onClick={onCancel} style={{ background: "none", border: "none", color: "#5a4535", cursor: "pointer", lineHeight: 1, display: "flex" }}>
              <XIcon size={20} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, margin: "14px 0 18px" }}>
          <div style={{ ...stepDotStyle, background: "#d4af37" }} />
          <div style={{ ...stepDotStyle, background: step !== "beer" ? "#d4af37" : "#2e2215" }} />
        </div>

        {beerPreview && step !== "beer" && (
          <img src={beerPreview} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", marginBottom: 14 }} />
        )}

        <p style={{ margin: "0 0 4px", color: "#f0e4cc", fontWeight: 700, fontSize: 15 }}>{stepTitle}</p>
        {stepSubtitle && <p style={{ margin: "0 0 18px", color: "#9a7d62", fontSize: 13, lineHeight: 1.5 }}>{stepSubtitle}</p>}

        {error && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#c07a3f" }}>{error}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture={step === "beer" ? "environment" : "user"}
          onChange={handleWebFile}
          style={{ display: "none" }}
        />

        {step !== "uploading" ? (
          <button onClick={handleCaptureClick} style={captureBtnStyle}>
            <DeviceCameraIcon size={16} /> {step === "beer" ? t("dualVerify.captureBeerBtn") : t("dualVerify.captureSelfieBtn")}
          </button>
        ) : (
          <p style={{ textAlign: "center", color: "#9a7d62", fontSize: 13, margin: 0 }}>{t("dualVerify.uploading")}</p>
        )}
      </div>
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 100000, padding: 16,
};
const modalStyle = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: 28, width: "100%", maxWidth: 400,
};
const stepDotStyle = { flex: 1, height: 4, borderRadius: 2, transition: "background 0.2s" };
const captureBtnStyle = {
  width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

export default DualPhotoVerification;
