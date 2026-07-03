import { useEffect } from "react";

const Lightbox = ({ src, alt = "", onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "min(900px, 90vw)",
          maxHeight: "85vh",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          objectFit: "contain",
        }}
      />

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(255,255,255,0.15)",
          border: "1.5px solid rgba(255,255,255,0.35)",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default Lightbox;
