import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LinkExternalIcon } from "@primer/octicons-react";
import { supabase } from "../services/supabase";
import { NATIVE_CARD_SHADOW } from "../utils/nativeElevation";

const CATEGORY_EMOJI = { general: "🍺", redes: "📱" };

const NewsCard = ({ item, t, lang }) => {
  const date = new Date(item.published_at).toLocaleDateString(lang, {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{CATEGORY_EMOJI[item.category] || "🍺"}</span>
        <span style={{ fontSize: 12, color: "#5a4535" }}>{date}</span>
        <span style={{ fontSize: 11, color: "#5a4535" }}>
          · {t(`noticias.category.${item.category}`)}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#f0e4cc", marginBottom: 4 }}>
        {item.title}
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#9a7d62", lineHeight: 1.5 }}>
        {item.body}
      </p>
      {item.link_url && (
        <a
          href={item.link_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 13, fontWeight: 700, color: "#d4af37", textDecoration: "none",
          }}
        >
          {t("noticias.readMore")} <LinkExternalIcon size={12} />
        </a>
      )}
    </div>
  );
};

const Noticias = () => {
  const { t, i18n } = useTranslation();
  const [news, setNews]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("news")
        .select("id, title, body, link_url, category, published_at")
        .order("published_at", { ascending: false });
      setNews(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p style={{ padding: 24, color: "#9a7d62" }}>{t("noticias.loading")}</p>;

  return (
    <div>
      <h2 style={{ margin: "0 0 4px" }}>📣 {t("noticias.title")}</h2>
      <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 24px" }}>
        {t("noticias.subtitle")}
      </p>

      {news.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ fontSize: 40, margin: "0 0 12px" }}>📰</p>
          <p style={{ margin: 0, fontWeight: 600, color: "#f0e4cc" }}>{t("noticias.empty.title")}</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9a7d62" }}>{t("noticias.empty.body")}</p>
        </div>
      ) : (
        news.map((item) => <NewsCard key={item.id} item={item} t={t} lang={i18n.language} />)
      )}
    </div>
  );
};

const cardStyle  = {
  background: "#1c1409",
  border: "1px solid #2e2215",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  boxShadow: NATIVE_CARD_SHADOW,
};
const emptyStyle = {
  textAlign: "center",
  padding: "60px 20px",
  background: "#1c1409",
  border: "1px solid #2e2215",
  borderRadius: 12,
};

export default Noticias;
