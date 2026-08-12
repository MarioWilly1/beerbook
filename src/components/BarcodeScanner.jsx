import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat } from "@zxing/library";
import { useTranslation } from "react-i18next";
import { XIcon } from "@primer/octicons-react";

// Escaneo de código de barras (EAN-13/UPC-A) vía getUserMedia + @zxing/browser —
// funciona igual en navegador y dentro del WebView de Capacitor (androidScheme
// "https" ya lo hace un contexto seguro), sin necesitar un plugin nativo.
const BarcodeScanner = ({ onDetected, onClose }) => {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    reader.possibleFormats = [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    ];

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result) => {
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            onDetectedRef.current(result.getText());
          }
        }
      )
      .then((controls) => {
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) setError(t("barcode.permissionError"));
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [t]);

  // Portal a document.body: este overlay se abre desde adentro del
  // contenido de una pestaña nativa (NativeTabSlide.jsx), que puede quedar
  // con un transform de GSAP activo — cualquier ancestro con transform
  // rompe position:fixed (deja de fijarse a la pantalla y pasa a
  // depender del tamaño de ese ancestro). El portal evita el problema de
  // raíz sin importar qué transform tenga el árbol de arriba.
  return ReactDOM.createPortal(
    <div style={overlayStyle}>
      <div style={topBarStyle}>
        <span style={{ color: "#f0e4cc", fontSize: 14, fontWeight: 700 }}>
          📷 {t("barcode.scannerTitle")}
        </span>
        <button onClick={onClose} style={closeBtnStyle}>
          <XIcon size={20} />
        </button>
      </div>

      {error ? (
        <div style={errorBoxStyle}>
          <p style={{ color: "#f0e4cc", fontSize: 14, margin: "0 0 16px", lineHeight: 1.5 }}>
            {error}
          </p>
          <button onClick={onClose} style={fallbackBtnStyle}>
            {t("barcode.closeBtn")}
          </button>
        </div>
      ) : (
        <>
          <video ref={videoRef} muted playsInline autoPlay style={videoStyle} />
          <div style={viewfinderStyle} />
          <p style={instructionsStyle}>{t("barcode.instructions")}</p>
        </>
      )}
    </div>,
    document.body
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "#000",
  zIndex: 99999, display: "flex", flexDirection: "column",
};
const topBarStyle = {
  position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 16px", background: "linear-gradient(rgba(0,0,0,0.6), transparent)",
};
const closeBtnStyle = {
  background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%",
  width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
  color: "#f0e4cc", cursor: "pointer",
};
const videoStyle = { width: "100%", height: "100%", objectFit: "cover" };
const viewfinderStyle = {
  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
  width: "78%", maxWidth: 340, height: 130,
  border: "3px solid #d4af37", borderRadius: 12,
  boxShadow: "0 0 0 2000px rgba(0,0,0,0.45)",
  pointerEvents: "none",
};
const instructionsStyle = {
  position: "absolute", bottom: 32, left: 16, right: 16, textAlign: "center",
  color: "#f0e4cc", fontSize: 13, fontWeight: 600, margin: 0,
  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
};
const errorBoxStyle = {
  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", padding: "0 32px", textAlign: "center",
};
const fallbackBtnStyle = {
  padding: "10px 24px", borderRadius: 8, border: "none",
  background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

export default BarcodeScanner;
