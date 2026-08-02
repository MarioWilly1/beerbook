import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { fetchTastingHistory } from "../utils/tastings";
import Lightbox from "./Lightbox";
import { XIcon } from "@primer/octicons-react";

const TastingGalleryModal = ({ userId, beerId, beerNombre, onClose }) => {
  const { t, i18n } = useTranslation();
  const [tastings, setTastings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchTastingHistory(supabase, userId, beerId).then(({ data }) => {
      if (!cancelled) {
        setTastings(data || []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [userId, beerId]);

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: "#f0e4cc" }}>{t("tastingGallery.title")}</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9a7d62" }}>{beerNombre}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a7d62", cursor: "pointer", display: "flex" }}>
            <XIcon size={18} />
          </button>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "#5a4535" }}>{t("tastingGallery.loading")}</p>
        ) : tastings.length === 0 ? (
          <p style={{ fontSize: 13, color: "#5a4535" }}>{t("tastingGallery.empty")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tastings.map((tasting, i) => (
              <div key={tasting.id} style={rowStyle}>
                {tasting.user_photo_url ? (
                  <img
                    src={tasting.user_photo_url}
                    alt=""
                    onClick={() => setLightboxSrc(tasting.user_photo_url)}
                    style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", cursor: "zoom-in", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: "#241a0e", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#d4af37" }}>
                      {i === 0 ? t("tastingGallery.latest") : t("tastingGallery.entryNumber", { n: tastings.length - i })}
                    </span>
                    <span style={{ fontSize: 10, color: "#5a4535", flexShrink: 0 }}>
                      {new Date(tasting.created_at).toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {tasting.rating != null && (
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#f0e4cc" }}>⭐ {tasting.rating} / 5</p>
                  )}
                  {tasting.comment && (
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9a7d62", overflowWrap: "break-word" }}>{tasting.comment}</p>
                  )}
                  {tasting.location_name && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8b6b2e" }}>📍 {tasting.location_name}</p>
                  )}
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: "#5a4535" }}>+{tasting.xp_earned} XP</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      </div>
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const panelStyle = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: "20px 18px 22px", width: "100%", maxWidth: 420, maxHeight: "85dvh",
  overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
};
const rowStyle = {
  display: "flex", gap: 10, padding: "8px 10px", borderRadius: 10,
  background: "#241a0e", border: "1px solid #2e2215",
};

export default TastingGalleryModal;
