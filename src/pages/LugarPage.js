import React from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLugar } from "../hooks/useLugar";
import Avatar from "../components/Avatar";

const LugarPage = () => {
  const { id } = useParams();
  const { t }  = useTranslation();
  const { place, beers, visitors, loading, error } = useLugar(id);

  return (
    <div style={pageStyle}>
      <TopBar />

      <div style={contentStyle}>
        {loading && (
          <p style={mutedStyle}>{t("lugar.loading")}</p>
        )}

        {!loading && (error || !place) && (
          <>
            <p style={mutedStyle}>{t("lugar.notFound")}</p>
            <Link to="/" style={backLinkStyle}>{t("lugar.backHome")}</Link>
          </>
        )}

        {!loading && place && (
          <>
            {/* Hero */}
            <div style={heroStyle}>
              <h1 style={heroTitleStyle}>{place.nombre}</h1>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 10 }}>
                {place.lat && place.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${place.lat},${place.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={mapLinkStyle}
                  >
                    📍 {t("lugar.viewMap")}
                  </a>
                )}
                {!place.claimed_by_business && (
                  <span style={unclaimedStyle}>
                    🏳 {t("lugar.unclaimed")}
                  </span>
                )}
              </div>
            </div>

            <div style={dividerStyle} />

            {/* Ranking de cervezas */}
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>🍺 {t("lugar.beersRanking")}</h2>
              {beers.length === 0 ? (
                <p style={mutedStyle}>{t("lugar.noBeers")}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {beers.map((beer) => (
                    <BeerRow key={beer.beer_id} beer={beer} />
                  ))}
                </div>
              )}
            </section>

            <div style={dividerStyle} />

            {/* Visitantes */}
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>👥 {t("lugar.visitors")}</h2>
              {visitors.length === 0 ? (
                <p style={mutedStyle}>{t("lugar.noVisitors")}</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  {visitors.map((v) => (
                    <Link key={v.user_id} to={`/perfil/${v.user_id}`} style={visitorLinkStyle}>
                      <Avatar avatarUrl={v.avatar_url} nombre={v.nombre} size={44} />
                      <span style={{ fontSize: 11, color: "#9a7d62", marginTop: 5, textAlign: "center", maxWidth: 60, wordBreak: "break-word" }}>
                        {v.nombre}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const TopBar = () => (
  <div style={topBarStyle}>
    <Link to="/" style={brandLinkStyle}>🍺 BeerBook</Link>
  </div>
);

const BeerRow = ({ beer }) => (
  <div style={beerRowStyle}>
    {beer.foto_url ? (
      <img src={beer.foto_url} alt={beer.nombre} style={thumbStyle} />
    ) : (
      <div style={{ ...thumbStyle, background: "#2a1e0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        🍺
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#f0e4cc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {beer.nombre}
      </div>
      <div style={{ fontSize: 12, color: "#9a7d62" }}>{beer.estilo}</div>
    </div>
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#d4af37" }}>{beer.veces}×</div>
      {beer.rating_promedio != null && (
        <div style={{ fontSize: 11, color: "#8b6b2e" }}>⭐ {beer.rating_promedio}</div>
      )}
      {beer.usuarios > 1 && (
        <div style={{ fontSize: 10, color: "#5a4535" }}>{beer.usuarios} usuarios</div>
      )}
    </div>
  </div>
);

// ── Styles ───────────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight:  "100vh",
  background: "#0d0a06",
};

const topBarStyle = {
  background:   "#1c1409",
  borderBottom: "1px solid #2e2215",
  padding:      "14px 24px",
};

const brandLinkStyle = {
  textDecoration: "none",
  color:          "#d4af37",
  fontFamily:     "'Playfair Display', serif",
  fontSize:       18,
  fontWeight:     700,
};

const contentStyle = {
  maxWidth: 640,
  margin:   "0 auto",
  padding:  "0 20px 48px",
};

const heroStyle = {
  padding: "32px 0 20px",
};

const heroTitleStyle = {
  margin:     "0 0 4px",
  fontSize:   "clamp(22px, 5vw, 30px)",
  fontFamily: "'Playfair Display', serif",
  color:      "#f0e4cc",
  lineHeight: 1.2,
};

const mapLinkStyle = {
  display:        "inline-flex",
  alignItems:     "center",
  gap:            4,
  fontSize:       13,
  color:          "#d4af37",
  textDecoration: "none",
  background:     "rgba(212,175,55,0.1)",
  border:         "1px solid rgba(212,175,55,0.25)",
  borderRadius:   20,
  padding:        "4px 12px",
  fontWeight:     600,
};

const unclaimedStyle = {
  fontSize:     11,
  fontWeight:   600,
  color:        "#5a4535",
  background:   "#1c1409",
  border:       "1px solid #2e2215",
  borderRadius: 20,
  padding:      "4px 12px",
};

const dividerStyle = {
  borderTop: "1px solid #2e2215",
  margin:    "24px 0",
};

const sectionStyle = {
  marginBottom: 8,
};

const sectionTitleStyle = {
  margin:     "0 0 14px",
  fontSize:   16,
  fontWeight: 700,
  color:      "#f0e4cc",
  fontFamily: "'Playfair Display', serif",
};

const beerRowStyle = {
  display:    "flex",
  alignItems: "center",
  gap:        12,
  padding:    "10px 14px",
  background: "#1c1409",
  border:     "1px solid #2e2215",
  borderRadius: 8,
};

const thumbStyle = {
  width:       48,
  height:      48,
  objectFit:   "cover",
  borderRadius: 6,
  flexShrink:  0,
};

const visitorLinkStyle = {
  display:        "flex",
  flexDirection:  "column",
  alignItems:     "center",
  gap:            2,
  textDecoration: "none",
};

const mutedStyle = {
  color:    "#5a4535",
  fontSize: 13,
  margin:   "24px 0 0",
};

const backLinkStyle = {
  display:        "inline-block",
  marginTop:      12,
  color:          "#8b6b2e",
  fontSize:       13,
  textDecoration: "none",
};

export default LugarPage;
