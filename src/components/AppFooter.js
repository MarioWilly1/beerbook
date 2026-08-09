import React from "react";
import { Link } from "react-router-dom";

// La marca pública en redes es @chapa_y_espuma, distinta del nombre interno
// de la app (RiBeer's) — a propósito, para no revelar el concepto antes del
// lanzamiento. No renombrar estos links a @RiBeers sin que Mario lo pida.
const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/chapa_y_espuma/",
  tiktok:    "https://www.tiktok.com/@chapa_y_espuma",
  youtube:   "https://www.youtube.com/@chapayespuma",
  discord:   "https://discord.gg/E6SGr3NX",
};

const FOOTER_CSS = `
  .app-footer a { color: #9a7d62; transition: color 0.15s; }
  .app-footer a:hover { color: #d4af37; }
  .app-footer .social-link { color: #5a4535; }
  .app-footer .social-link:hover { color: #d4af37; }
`;

const InstagramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

const TikTokIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M14 4v10.2a3.4 3.4 0 1 1-3.4-3.4c.3 0 .6.03.9.1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 4c.4 2.2 2.1 3.8 4.3 4.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const YouTubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2.5" y="6" width="19" height="12" rx="4" />
    <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
  </svg>
);

const DiscordIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15c0-3.5 1-7 2.6-8.4C8 5.6 10 5 12 5s4 .6 5.4 1.6C19 8 20 11.5 20 15c-1.6 1.2-3.4 1.8-3.4 1.8l-.8-1.4c-1.1.3-2.4.5-3.8.5s-2.7-.2-3.8-.5l-.8 1.4S5.6 16.2 4 15z" />
    <circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const SocialIcon = ({ href, label, children }) => (
  <a
    href={href || "#"}
    target={href ? "_blank" : undefined}
    rel={href ? "noopener noreferrer" : undefined}
    title={label}
    aria-label={label}
    className="social-link"
    style={{
      display: "flex",
      opacity: href ? 1 : 0.35,
      pointerEvents: href ? "auto" : "none",
    }}
  >
    {children}
  </a>
);

const AppFooter = () => (
  <footer className="app-footer" style={footerStyle}>
    <style>{FOOTER_CSS}</style>

    <div style={linksRowStyle}>
      <span style={labelStyle}>Atención al Cliente</span>
      <span style={dotStyle}>·</span>
      <Link to="/configuracion?tab=ayuda" style={linkStyle}>Soporte</Link>
      <span style={dotStyle}>·</span>
      <Link to="/legal" style={linkStyle}>Política de Privacidad y Términos</Link>
    </div>

    <div style={iconsRowStyle}>
      <SocialIcon href={SOCIAL_LINKS.instagram} label="Instagram @chapa_y_espuma"><InstagramIcon /></SocialIcon>
      <SocialIcon href={SOCIAL_LINKS.tiktok} label="TikTok @chapa_y_espuma"><TikTokIcon /></SocialIcon>
      <SocialIcon href={SOCIAL_LINKS.youtube} label="YouTube @chapayespuma"><YouTubeIcon /></SocialIcon>
      <SocialIcon href={SOCIAL_LINKS.discord} label="Discord — Chapa y Espuma"><DiscordIcon /></SocialIcon>
    </div>
  </footer>
);

const footerStyle = {
  maxWidth: 760,
  margin: "56px auto 0",
  paddingTop: 18,
  borderTop: "1px solid #2e2215",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};
const linksRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  fontSize: 11.5,
};
const labelStyle = {
  color: "#5a4535",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  fontSize: 10.5,
};
const dotStyle = { color: "#2e2215" };
const linkStyle = { textDecoration: "none" };
const iconsRowStyle = { display: "flex", gap: 14, alignItems: "center" };

export default AppFooter;
