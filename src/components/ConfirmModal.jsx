import React from "react";

// Modal de confirmación genérico y reutilizable ("¿Estás seguro?"), mismo
// patrón visual (overlay + card centrada) que el resto de los modales de
// la app. `danger` cambia el botón de confirmar a un tono rojizo, para
// acciones de salida/negativas (cerrar sesión, borrar, etc.).
const ConfirmModal = ({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}) => (
  <div
    onClick={onCancel}
    style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "rgba(5,4,3,0.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%", maxWidth: 360,
        background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
        padding: "22px 20px",
      }}
    >
      {title && (
        <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#f0e4cc" }}>
          {title}
        </p>
      )}
      {message && (
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "#9a7d62", lineHeight: 1.5 }}>
          {message}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={secondaryBtnStyle}>{cancelLabel}</button>
        <button onClick={onConfirm} style={danger ? dangerBtnStyle : primaryBtnStyle}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const primaryBtnStyle = {
  padding: "9px 18px", borderRadius: 999, border: "1px solid #d4af3788",
  background: "#d4af371e", color: "#f0e4cc", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const dangerBtnStyle = {
  padding: "9px 18px", borderRadius: 999, border: "1px solid #c0392b88",
  background: "#c0392b26", color: "#f0e4cc", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const secondaryBtnStyle = {
  padding: "9px 18px", borderRadius: 999, border: "1px solid #2e2215",
  background: "none", color: "#9a7d62", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

export default ConfirmModal;
