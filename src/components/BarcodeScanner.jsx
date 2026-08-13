import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, NotFoundException, ChecksumException, FormatException } from "@zxing/library";
import { useTranslation } from "react-i18next";
import { XIcon } from "@primer/octicons-react";

// Errores "normales" de cada frame sin código legible a la vista — el loop
// interno de zxing los reintenta solo, no ameritan mostrar nada.
const isRetryableScanError = (err) =>
  err instanceof NotFoundException || err instanceof ChecksumException || err instanceof FormatException;

// controls.stop() puede tirar en algunos WebView (ej. frenar el track de
// cámara en medio de un frame) — si eso pasa SIN capturar dentro de la
// limpieza del useEffect (que corre al desmontar, ej. cuando onDetected ya
// cerró el escáner), React lo trata como un error no atrapado y puede
// interrumpir el resto del commit — exactamente el "pantalla gris, después
// no pasa nada" reportado. Se centraliza acá para que TODOS los puntos que
// llaman a stop() (detección, cleanup, cancelación tardía) queden a salvo.
const safeStop = (controls) => {
  try {
    controls?.stop();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[BarcodeScanner] stop() tiró un error:", err);
  }
};

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
        // El loop interno de zxing (BrowserCodeReader.scan) llama a este
        // callback con (result, error, controls) en CADA frame — no se
        // detiene solo porque hubo un resultado exitoso, y si ocurre un
        // error que no sea "todavía no encontré nada" (NotFound/Checksum/
        // FormatException, lo normal en casi todos los frames), el loop lo
        // trata como fatal: detiene el stream de cámara internamente y
        // nunca vuelve a llamar al callback. Antes solo mirábamos `result`
        // e ignorábamos `error` por completo, así que ese caso ("la cámara
        // se cierra sola pero no pasa nada") quedaba completamente mudo acá.
        (result, err, controls) => {
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            const code = result.getText();
            // eslint-disable-next-line no-console
            console.log("[BarcodeScanner] código detectado:", code);
            // Frenar la cámara ACÁ, antes de avisarle al padre — así lo que
            // haga onDetected (que puede disparar varios setState en
            // cascada) nunca corre dentro del try/catch del loop de zxing:
            // si tirara una excepción inesperada, zxing la reinterpretaría
            // como un fallo de escaneo fatal en vez de un problema nuestro.
            safeStop(controls);
            // eslint-disable-next-line no-console
            console.log("[BarcodeScanner] cámara frenada (o el intento falló, ver log de arriba si corresponde)");
            try {
              onDetectedRef.current(code);
              // eslint-disable-next-line no-console
              console.log("[BarcodeScanner] onDetected ejecutado sin errores");
            } catch (onDetectedErr) {
              // eslint-disable-next-line no-console
              console.error("[BarcodeScanner] onDetected tiró un error:", onDetectedErr);
              if (!cancelled) setError(t("barcode.scanError"));
            }
            return;
          }
          if (err && !isRetryableScanError(err) && !detectedRef.current && !cancelled) {
            // eslint-disable-next-line no-console
            console.error("[BarcodeScanner] error fatal del loop de escaneo:", err);
            setError(t("barcode.scanError"));
          }
        }
      )
      .then((controls) => {
        if (cancelled) { safeStop(controls); return; }
        controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) setError(t("barcode.permissionError"));
      });

    return () => {
      cancelled = true;
      safeStop(controlsRef.current);
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
