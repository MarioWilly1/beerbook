import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import { compressImage, uploadUserBeerPhoto } from "../utils/photoUpload";
import { hashToString } from "../utils/perceptualHash";
import { supabase } from "../services/supabase";
import { XIcon } from "@primer/octicons-react";

// Verificación Reforzada (Fase F2, corregida): captura secuencial estilo
// BeReal — primero la cerveza, inmediatamente después una selfie — vía
// getUserMedia en vez de @capacitor/camera. El plugin de Capacitor NO
// permite forzar cámara trasera/frontal en Android (su propio README:
// "cameraDirection: iOS and Web only" — en Android el parámetro se ignora y
// abre lo que el sistema define por default). getUserMedia con la
// constraint `facingMode` sí lo respeta en el WebView, mismo mecanismo que
// ya usa BarcodeScanner.jsx para el video en vivo — unifica web y nativo en
// un solo camino, sin bifurcación de plataforma.
const DualPhotoVerification = ({ beerNombre, beerId, onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState("beer"); // beer | selfie | uploading
  const [beerPreview, setBeerPreview] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const beerDataRef = useRef(null); // { blob, hash }

  // Se vuelve a pedir la cámara con el facingMode correcto en cada paso —
  // así se fuerza trasera/frontal de verdad, a diferencia del plugin nativo.
  useEffect(() => {
    if (step === "uploading") return;
    let cancelled = false;
    setCameraError("");

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: step === "beer" ? "environment" : "user" },
    }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => {
      if (!cancelled) setCameraError(t("dualVerify.cameraError"));
    });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [step, t]);

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

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => { if (blob) processCaptured(blob); }, "image/jpeg", 0.9);
  };

  const stepTitle = step === "beer" ? t("dualVerify.step1Title")
    : step === "selfie" ? t("dualVerify.step2Title")
    : t("dualVerify.uploading");
  const stepSubtitle = step === "beer" ? t("dualVerify.step1Subtitle")
    : step === "selfie" ? t("dualVerify.step2Subtitle") : "";

  // Portal a document.body — este overlay se abre desde adentro del
  // contenido de una pestaña nativa (NativeSwipeTabs.jsx), que puede quedar
  // con un transform de GSAP activo; cualquier ancestro con transform rompe
  // position:fixed. El portal lo evita sin importar el árbol de arriba.
  return ReactDOM.createPortal(
    <div style={overlayStyle}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={topBarStyle}>
        <div style={{ flex: 1 }}>
          <span style={{ color: "#f0e4cc", fontSize: 14, fontWeight: 700 }}>
            🛡️ {t("dualVerify.title")}
          </span>
          <div style={{ display: "flex", gap: 6, marginTop: 8, maxWidth: 120 }}>
            <div style={{ ...stepDotStyle, background: "#d4af37" }} />
            <div style={{ ...stepDotStyle, background: step !== "beer" ? "#d4af37" : "rgba(255,255,255,0.3)" }} />
          </div>
        </div>
        {step !== "uploading" && (
          <button onClick={onCancel} style={closeBtnStyle}>
            <XIcon size={20} />
          </button>
        )}
      </div>

      {cameraError ? (
        <div style={errorBoxStyle}>
          <p style={{ color: "#f0e4cc", fontSize: 14, margin: "0 0 16px", lineHeight: 1.5 }}>
            {cameraError}
          </p>
          <button onClick={onCancel} style={fallbackBtnStyle}>
            {t("barcode.closeBtn")}
          </button>
        </div>
      ) : step === "uploading" ? (
        <div style={errorBoxStyle}>
          <p style={{ color: "#9a7d62", fontSize: 14, margin: 0 }}>{t("dualVerify.uploading")}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef} muted playsInline autoPlay
            style={{ ...videoStyle, transform: step === "selfie" ? "scaleX(-1)" : "none" }}
          />

          {beerPreview && step === "selfie" && (
            <img src={beerPreview} alt="" style={beerThumbStyle} />
          )}

          <div style={bottomBarStyle}>
            <p style={{ margin: "0 0 4px", color: "#f0e4cc", fontWeight: 700, fontSize: 15, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              {stepTitle}
            </p>
            {stepSubtitle && (
              <p style={{ margin: "0 0 18px", color: "#e8dcc0", fontSize: 12, lineHeight: 1.4, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                {stepSubtitle}
              </p>
            )}
            {error && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#ff8a3d" }}>{error}</p>}
            <button onClick={handleCapture} aria-label={t("dualVerify.captureBtn")} style={shutterBtnStyle}>
              <span style={shutterInnerStyle} />
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "#000",
  zIndex: 100000, display: "flex", flexDirection: "column",
};
const topBarStyle = {
  position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
  padding: "16px 16px", background: "linear-gradient(rgba(0,0,0,0.6), transparent)",
};
const closeBtnStyle = {
  background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%",
  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
  color: "#f0e4cc", cursor: "pointer", flexShrink: 0,
};
const stepDotStyle = { flex: 1, height: 4, borderRadius: 2, transition: "background 0.2s" };
const videoStyle = { width: "100%", height: "100%", objectFit: "cover" };
const beerThumbStyle = {
  position: "absolute", top: 74, right: 16, width: 56, height: 56,
  borderRadius: 10, objectFit: "cover", border: "2px solid #d4af37",
  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
};
const bottomBarStyle = {
  position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
  padding: "24px 20px calc(28px + env(safe-area-inset-bottom, 0px))",
  background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
  display: "flex", flexDirection: "column", alignItems: "center",
};
const shutterBtnStyle = {
  width: 72, height: 72, borderRadius: "50%",
  border: "4px solid #f0e4cc", background: "rgba(255,255,255,0.15)",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};
const shutterInnerStyle = {
  width: 56, height: 56, borderRadius: "50%", background: "#d4af37",
};
const errorBoxStyle = {
  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", padding: "0 32px", textAlign: "center",
};
const fallbackBtnStyle = {
  padding: "10px 24px", borderRadius: 8, border: "none",
  background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

export default DualPhotoVerification;
