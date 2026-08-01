import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { compressImage, uploadUserGlassPhoto, uploadGlassSuggestionPhoto } from "../utils/photoUpload";
import { hashToString } from "../utils/perceptualHash";
import { useCollectibleGlasses } from "../hooks/useCollectibleGlasses";
import GlassCollectionCard from "../components/GlassCollectionCard";
import { XIcon, DeviceCameraIcon, PlusIcon, SearchIcon } from "@primer/octicons-react";

// Mismo helper que Dashboard.js/MiCuaderno.js/OriginMapPanel.js.
function normalizeStr(str) {
  if (!str) return "";
  const nfd = str.normalize("NFD");
  let out = "";
  for (let i = 0; i < nfd.length; i++) {
    const code = nfd.charCodeAt(i);
    if (code < 0x0300 || code > 0x036f) out += nfd[i];
  }
  return out.toLowerCase();
}

const RAREZA_ORDER = ["mitica", "legendaria", "epica", "rara", "poco_comun", "comun"];
const RAREZA_LABEL  = {
  comun: "⚪ Común", poco_comun: "🟢 Poco común", rara: "🔵 Rara",
  epica: "🟣 Épica", legendaria: "🟡 Legendaria", mitica: "🌈 Mítica",
};
const RAREZA_STYLE = {
  comun:      { border: "1px solid #2e2215",      glow: "none" },
  poco_comun: { border: "1.5px solid #2d6645",    glow: "none" },
  rara:       { border: "2px solid #1a6fa8",       glow: "0 0 8px 2px rgba(26,111,168,0.25)" },
  epica:      { border: "2px solid #7c3aed",       glow: "0 0 8px 2px rgba(124,58,237,0.3)" },
  legendaria: { border: "2px solid #b8940a",       glow: "0 0 12px 4px rgba(212,175,55,0.3)" },
  mitica:     { border: "2px solid #9020d0",       glow: "0 0 12px 4px rgba(144,32,208,0.4)" },
};

const overlayS = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16,
};
const panelS = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: "24px 20px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
  maxHeight: "90dvh", overflowY: "auto", boxSizing: "border-box",
};
const ctrlS = {
  padding: "7px 10px", borderRadius: 8, border: "1px solid #2e2215",
  background: "#1c1409", color: "#f0e4cc", fontSize: 12, cursor: "pointer",
};
const inputS = {
  width: "100%", padding: "9px 12px", marginBottom: 14, borderRadius: 8,
  background: "#0d0a06", border: "1px solid #2e2215", color: "#f0e4cc",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};
const labelS = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#9a7d62",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5,
};

// ── GlassLockedCard ──────────────────────────────────────────────────────────
const GlassLockedCard = ({ glass, onClick }) => {
  const rs = RAREZA_STYLE[glass.rareza] || RAREZA_STYLE.comun;
  const label = RAREZA_LABEL[glass.rareza] || "⚪";

  return (
    <div
      onClick={() => onClick(glass)}
      style={{
        borderRadius: 14, overflow: "hidden", cursor: "pointer",
        border: rs.border, background: "#1c1409", opacity: 0.7,
        transition: "opacity 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.transform = "scale(1)"; }}
    >
      <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
        {glass.foto_url ? (
          <img
            src={glass.foto_url}
            alt={glass.nombre}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) brightness(0.55)", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, filter: "grayscale(1) brightness(0.55)" }}>🍷</div>
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
          <span style={{ fontSize: 32, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.8))" }}>🔒</span>
        </div>
        <div style={{
          position: "absolute", top: 8, right: 8, padding: "3px 9px", borderRadius: 20,
          fontSize: 10, fontWeight: 800, background: "rgba(0,0,0,0.65)",
          color: "#5a4535", border: "1px solid rgba(80,60,60,0.35)",
        }}>
          {label}
        </div>
      </div>
      <div style={{ padding: "10px 12px 12px", background: "#160f07" }}>
        <p style={{
          margin: "0 0 2px", fontWeight: 700, fontSize: 12, color: "#5a4535",
          fontFamily: "'Playfair Display', serif", lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {glass.nombre}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: "#3a2e20" }}>
          {glass.marca || "—"}
        </p>
      </div>
    </div>
  );
};

// ── CollectGlassModal — subir tu propia foto para coleccionar ────────────────
const CollectGlassModal = ({ glass, onClose, onCollected }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      const { blob, hash } = await compressImage(file);
      const publicUrl = await uploadUserGlassPhoto(supabase, session.user.id, glass.nombre, glass.id, blob);
      const { error: insErr } = await supabase.from("user_glasses").insert({
        user_id: session.user.id,
        glass_id: glass.id,
        user_photo_url: publicUrl,
        photo_hash: hashToString(hash),
      });
      if (insErr) throw insErr;
      onCollected();
    } catch {
      setError("Error al subir la foto. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={overlayS} onClick={onClose}>
      <div style={{ ...panelS, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a4535", cursor: "pointer", display: "flex" }}>
            <XIcon size={18} />
          </button>
        </div>
        {glass.foto_url && (
          <img src={glass.foto_url} alt={glass.nombre}
            style={{ width: 96, height: 96, borderRadius: 12, objectFit: "cover", margin: "0 auto 14px", display: "block", filter: "grayscale(1) brightness(0.6)" }} />
        )}
        <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#f0e4cc", fontFamily: "'Playfair Display', serif" }}>
          {glass.nombre}
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#9a7d62" }}>
          {RAREZA_LABEL[glass.rareza]}
        </p>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "#9a7d62", lineHeight: 1.6 }}>
          Para coleccionar esta copa, subí una foto real tuya con ella (cámara o galería).
        </p>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {error && <p style={{ color: "#c07a3f", fontSize: 12, margin: "0 0 10px" }}>{error}</p>}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
            background: uploading ? "#2a1e0f" : "#d4af37",
            color: uploading ? "#5a4535" : "#0d0a06",
            fontWeight: 700, fontSize: 14, cursor: uploading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {uploading ? "Subiendo…" : (<><DeviceCameraIcon size={16} /> Subir mi foto</>)}
        </button>
      </div>
    </div>
  );
};

// ── SuggestGlassModal ─────────────────────────────────────────────────────────
const SuggestGlassModal = ({ onClose }) => {
  const { t } = useTranslation();
  const [nombre, setNombre]           = useState("");
  const [marca, setMarca]             = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotoFile, setFotoFile]       = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [beerQuery, setBeerQuery]     = useState("");
  const [beerResults, setBeerResults] = useState([]);
  const [beerSelected, setBeerSelected] = useState(null);
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [error, setError]             = useState("");
  const fileInputRef = useRef(null);

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleBeerSearch = async (q) => {
    setBeerQuery(q);
    setBeerSelected(null);
    if (q.trim().length < 2) { setBeerResults([]); return; }
    const { data } = await supabase
      .from("beers_new")
      .select("id, nombre, estilo")
      .ilike("nombre", `%${q.trim()}%`)
      .order("nombre")
      .limit(10);
    setBeerResults(data || []);
  };

  const handleSend = useCallback(async () => {
    if (!nombre.trim()) { setError(t("suggestGlass.errorNombre")); return; }
    if (!fotoFile) { setError(t("suggestGlass.errorFoto")); return; }
    setSending(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      const { blob } = await compressImage(fotoFile);
      const fotoUrl = await uploadGlassSuggestionPhoto(supabase, session.user.id, blob);
      const { error: insErr } = await supabase.from("glass_suggestions").insert({
        user_id: session.user.id,
        nombre: nombre.trim(),
        marca: marca.trim() || null,
        descripcion: descripcion.trim() || null,
        foto_url: fotoUrl,
        beer_id: beerSelected?.id ?? null,
      });
      if (insErr) throw insErr;
      setSent(true);
    } catch {
      setError(t("suggestGlass.errorGeneric"));
    } finally {
      setSending(false);
    }
  }, [nombre, marca, descripcion, fotoFile, beerSelected, t]);

  return (
    <div style={overlayS} onClick={onClose}>
      <div style={panelS} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0, flex: 1, fontFamily: "'Playfair Display', serif", color: "#f0e4cc", fontSize: 20 }}>
            🍷 {t("suggestGlass.title")}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a4535", cursor: "pointer", lineHeight: 1, display: "flex" }}>
            <XIcon size={20} />
          </button>
        </div>
        <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
          {t("suggestGlass.subtitle")}
        </p>

        {sent ? (
          <p style={{ color: "#4caf50", fontWeight: 600, fontSize: 15, textAlign: "center", padding: "20px 0" }}>
            ✓ {t("suggestGlass.sent")}
          </p>
        ) : (
          <>
            <label style={labelS}>{t("suggestGlass.nombreLabel")} *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 100))} placeholder={t("suggestGlass.nombrePlaceholder")} style={inputS} />

            <label style={labelS}>{t("suggestGlass.marcaLabel")}</label>
            <input value={marca} onChange={(e) => setMarca(e.target.value.slice(0, 100))} placeholder={t("suggestGlass.marcaPlaceholder")} style={inputS} />

            <label style={labelS}>{t("suggestGlass.descripcionLabel")}</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value.slice(0, 400))}
              placeholder={t("suggestGlass.descripcionPlaceholder")}
              rows={3}
              maxLength={400}
              style={{ ...inputS, resize: "none", fontFamily: "Inter, sans-serif", marginBottom: 4 }}
              spellCheck="true"
              autoCorrect="on"
              autoCapitalize="sentences"
            />
            <div style={{ fontSize: 11, color: descripcion.length >= 360 ? "#8b2020" : "#5a4535", textAlign: "right", marginBottom: 14 }}>
              {descripcion.length}/400
            </div>

            <label style={labelS}>{t("suggestGlass.beerLabel")}</label>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <input
                value={beerSelected ? beerSelected.nombre : beerQuery}
                onChange={(e) => handleBeerSearch(e.target.value)}
                placeholder={t("suggestGlass.beerSearchPlaceholder")}
                style={{ ...inputS, marginBottom: 0 }}
              />
              {beerResults.length > 0 && !beerSelected && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                  background: "#0d0a06", border: "1px solid #2e2215", borderRadius: "0 0 8px 8px",
                  maxHeight: 180, overflowY: "auto",
                }}>
                  {beerResults.map((b) => (
                    <div key={b.id}
                      onClick={() => { setBeerSelected(b); setBeerResults([]); }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#f0e4cc", borderBottom: "1px solid #2e2215" }}
                    >
                      {b.nombre} {b.estilo && <span style={{ color: "#5a4535" }}>· {b.estilo}</span>}
                    </div>
                  ))}
                </div>
              )}
              {beerSelected && (
                <button
                  onClick={() => { setBeerSelected(null); setBeerQuery(""); }}
                  style={{ marginTop: 6, background: "none", border: "none", color: "#c07a3f", fontSize: 11, cursor: "pointer", padding: 0 }}
                >
                  {t("suggestGlass.beerRemove")}
                </button>
              )}
            </div>

            <label style={labelS}>{t("suggestGlass.fotoLabel")} *</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: "none" }} />
            {fotoPreview ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <img src={fotoPreview} alt="preview" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: "8px 12px", background: "#1c1409", border: "1.5px dashed #3a2e20", borderRadius: 8, fontSize: 12, color: "#9a7d62", cursor: "pointer" }}
                >
                  {t("suggestGlass.fotoChange")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%", padding: "10px", background: "#1c1409", border: "1.5px dashed #3a2e20",
                  borderRadius: 8, fontSize: 13, color: "#9a7d62", cursor: "pointer", fontWeight: 600,
                  marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <DeviceCameraIcon size={14} /> {t("suggestGlass.fotoChoose")}
              </button>
            )}

            {error && <p style={{ color: "#c07a3f", fontSize: 12, margin: "-8px 0 12px" }}>{error}</p>}

            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
                background: sending ? "#2a1e0f" : "#d4af37",
                color: sending ? "#5a4535" : "#0d0a06",
                fontWeight: 700, fontSize: 15,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? t("suggestGlass.sending") : t("suggestGlass.sendBtn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── GlassesTab (main) ──────────────────────────────────────────────────────────
const GlassesTab = () => {
  const { t } = useTranslation();
  const { items, loading, refetch } = useCollectibleGlasses();
  const [nameSearch, setNameSearch]     = useState("");
  const [rarezaFilter, setRarezaFilter] = useState("all");
  const [showFilter, setShowFilter]     = useState("all");
  const [collectModal, setCollectModal] = useState(null);
  const [suggestModal, setSuggestModal] = useState(false);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a4535" }}>
        <p style={{ fontSize: 14 }}>Cargando copas…</p>
      </div>
    );
  }

  const visible = items
    .filter((g) => !nameSearch || normalizeStr(g.nombre).includes(normalizeStr(nameSearch)))
    .filter((g) => rarezaFilter === "all" || g.rareza === rarezaFilter)
    .filter((g) => showFilter === "all" || (showFilter === "owned" ? g.owned : !g.owned))
    .sort((a, b) => {
      const rd = RAREZA_ORDER.indexOf(a.rareza ?? "comun") - RAREZA_ORDER.indexOf(b.rareza ?? "comun");
      if (rd !== 0) return rd;
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      return (a.nombre || "").localeCompare(b.nombre || "");
    });

  const ownedCount = items.filter((g) => g.owned).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button
          onClick={() => setSuggestModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,0.35)",
            background: "rgba(212,175,55,0.08)", color: "#d4af37", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          <PlusIcon size={14} /> {t("suggestGlass.btn")}
        </button>
      </div>

      {totalCount === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#5a4535" }}>
          <p>Todavía no hay copas en el catálogo. ¡Sugerí la primera!</p>
        </div>
      ) : (
        <>
          <div style={{ background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#d4af37", fontFamily: "'Playfair Display', serif" }}>
                🍷 Copas
              </span>
              <span style={{ fontSize: 13, color: "#9a7d62" }}>
                <strong style={{ color: "#f0e4cc" }}>{ownedCount}</strong> / {totalCount} conseguidas
              </span>
              <span style={{ fontSize: 12, color: "#5a4535", marginLeft: "auto" }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: "#2e2215", borderRadius: 10, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 10, width: `${pct}%`,
                background: pct === 100 ? "linear-gradient(90deg, #d4af37, #c07a3f)" : "linear-gradient(90deg, #4a90d9, #d4af37)",
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>

          <div style={{ position: "relative", marginBottom: 12 }}>
            <span style={{
              position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              color: "#5a4535", pointerEvents: "none", display: "flex",
            }}>
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder="Buscar copa…"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 32px 9px 34px",
                background: "#1c1409", border: "1px solid #2e2215",
                borderRadius: 8, color: "#f0e4cc", fontSize: 14, outline: "none",
              }}
            />
            {nameSearch && (
              <button onClick={() => setNameSearch("")}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#5a4535",
                  cursor: "pointer", lineHeight: 1, display: "flex",
                }}>
                <XIcon size={16} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <select value={rarezaFilter} onChange={(e) => setRarezaFilter(e.target.value)} style={ctrlS}>
              <option value="all">Todas las rarezas</option>
              {RAREZA_ORDER.filter((r) => items.some((g) => g.rareza === r)).map((r) => (
                <option key={r} value={r}>{RAREZA_LABEL[r]}</option>
              ))}
            </select>
            <select value={showFilter} onChange={(e) => setShowFilter(e.target.value)} style={ctrlS}>
              <option value="all">Ver todas</option>
              <option value="owned">✅ Conseguidas</option>
              <option value="locked">🔒 Pendientes</option>
            </select>
          </div>

          <p style={{ fontSize: 12, color: "#5a4535", margin: "0 0 14px" }}>
            {/* Conseguidas DENTRO del filtro actual — mismo fix que en
                BeerColeccionTab (MiCuaderno.js), heredaba el mismo bug. */}
            {visible.filter((g) => g.owned).length} de {visible.length} copa{visible.length !== 1 ? "s" : ""} conseguida{visible.length !== 1 ? "s" : ""}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 14 }}>
            {visible.map((glass) =>
              glass.owned ? (
                <GlassCollectionCard key={glass.id} glass={glass} />
              ) : (
                <GlassLockedCard key={glass.id} glass={glass} onClick={setCollectModal} />
              )
            )}
          </div>

          {visible.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#5a4535" }}>
              <p>No hay copas con ese filtro.</p>
            </div>
          )}
        </>
      )}

      {collectModal && (
        <CollectGlassModal
          glass={collectModal}
          onClose={() => setCollectModal(null)}
          onCollected={() => { setCollectModal(null); refetch(); }}
        />
      )}
      {suggestModal && <SuggestGlassModal onClose={() => setSuggestModal(false)} />}
    </div>
  );
};

export default GlassesTab;
