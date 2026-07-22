import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import ReportEntryModal from "./ReportEntryModal";

// Se abre desde una fila de Ranking (sin entrar al perfil completo):
// lista las entradas verificadas visibles de ese usuario (mismo criterio
// de privacidad que ProfilePage.js, vía get_visible_user_beers) para
// elegir cuál reportar. Al elegir una, delega en ReportEntryModal.
const ReportUserEntriesModal = ({ user, onClose }) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(null); // null = cargando
  const [picked, setPicked]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_visible_user_beers", { p_user_id: user.id }).then(({ data }) => {
      if (!cancelled) setEntries(data || []);
    });
    return () => { cancelled = true; };
  }, [user.id]);

  if (picked) {
    return (
      <ReportEntryModal
        target={{ user_id: user.id, beer_id: picked.beer_id, nombre: user.nombre, beer_nombre: picked.beer_nombre }}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(5,4,3,0.82)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 380, maxHeight: "70vh", overflowY: "auto",
          background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
          padding: "18px 16px",
        }}
      >
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#f0e4cc" }}>
          🚩 {t("feed.report.pickEntryTitle", { nombre: user.nombre })}
        </p>

        {entries === null ? (
          <p style={{ color: "#9a7d62", fontSize: 13 }}>{t("admin.loading")}</p>
        ) : entries.length === 0 ? (
          <p style={{ color: "#5a4535", fontSize: 13 }}>{t("feed.report.noEntries")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entries.map((e) => (
              <div
                key={e.beer_id}
                onClick={() => setPicked(e)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                  border: "1px solid #2e2215", background: "#2a1e0f",
                }}
              >
                <img
                  src={e.user_photo_url} alt=""
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: "#f0e4cc", flex: 1 }}>{e.beer_nombre}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: "100%", padding: "9px 18px", borderRadius: 999,
            border: "1px solid #2e2215", background: "none", color: "#9a7d62",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          {t("feed.report.cancel")}
        </button>
      </div>
    </div>
  );
};

export default ReportUserEntriesModal;
