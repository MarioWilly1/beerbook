import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseCoords = (raw) => {
  if (!raw || !raw.trim()) return null;
  const nums = raw.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 2) return null;
  const lat = parseFloat(nums[0]);
  const lng = parseFloat(nums[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

// ── Sub-panel: Cargar Cerveza ─────────────────────────────────────────────────
const CargarCerveza = () => {
  const [form, setForm] = useState({
    nombre: "", estilo: "", pais: "", alcohol: "", info_detallada: "",
    rareza: "comun", es_edicion_especial: false, motivo_edicion: "",
  });
  const [fotoFile, setFotoFile]       = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [coordsRaw, setCoordsRaw]     = useState("");
  const [coordsParsed, setCoordsParsed] = useState(null);
  const [coordsError, setCoordsError]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleCoords = (e) => {
    const raw = e.target.value;
    setCoordsRaw(raw);
    if (!raw.trim()) { setCoordsParsed(null); setCoordsError(""); return; }
    const parsed = parseCoords(raw);
    if (parsed) { setCoordsParsed(parsed); setCoordsError(""); }
    else { setCoordsParsed(null); setCoordsError("No se pudo extraer lat/lng válidos. Revisá el formato."); }
  };

  const handleCopyPrompt = () => {
    const { nombre, estilo, pais } = form;
    const prompt =
      `Necesito la descripción técnica y las coordenadas de origen para: ${nombre || "[nombre]"}, ` +
      `estilo ${estilo || "[estilo]"}, país/región ${pais || "[país]"}. ` +
      `Devolvé:\n` +
      `1) Un párrafo breve técnico de la cerveza (sabor, aroma, color, maridaje).\n` +
      `2) Las coordenadas de origen en formato: lat, lng (solo los dos números con signo negativo si corresponde, separados por coma).`;
    navigator.clipboard.writeText(prompt).catch(() => {});
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setError(""); setSuccess(""); setSaving(true);

    let foto_url = null;

    // 1. Upload foto si hay archivo
    if (fotoFile) {
      const ext  = fotoFile.name.split(".").pop();
      const path = `${form.nombre.trim()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("Cervezas")
        .upload(path, fotoFile, { upsert: true, contentType: fotoFile.type });
      if (upErr) { setError(`Error subiendo foto: ${upErr.message}`); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("Cervezas").getPublicUrl(path);
      foto_url = urlData.publicUrl;
    }

    // 2. Insert en beers_new
    const row = {
      nombre:             form.nombre.trim() || null,
      estilo:             form.estilo.trim() || null,
      pais:               form.pais.trim() || null,
      alcohol:            form.alcohol !== "" ? parseFloat(form.alcohol) : null,
      info_detallada:     form.info_detallada.trim() || null,
      foto_url,
      origen_lat:         coordsParsed?.lat ?? null,
      origen_lng:         coordsParsed?.lng ?? null,
      rareza:             form.rareza,
      es_edicion_especial: form.es_edicion_especial,
      motivo_edicion:     form.motivo_edicion.trim() || null,
    };

    const { error: dbErr } = await supabase.from("beers_new").insert(row);
    if (dbErr) { setError(`Error guardando: ${dbErr.message}`); setSaving(false); return; }

    setSuccess(`✓ "${form.nombre}" guardada correctamente.`);
    setForm({ nombre: "", estilo: "", pais: "", alcohol: "", info_detallada: "", rareza: "comun", es_edicion_especial: false, motivo_edicion: "" });
    setFotoFile(null); setFotoPreview(null);
    setCoordsRaw(""); setCoordsParsed(null);
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 580 }}>

      {/* ── Básicos ── */}
      <div style={sectionCard}>
        <p style={sectionTitle}>Datos básicos</p>

        <Field label="Nombre *">
          <input value={form.nombre} onChange={set("nombre")} placeholder="Ej: Tripel Karmeliet" style={input} />
        </Field>
        <Field label="Estilo">
          <input value={form.estilo} onChange={set("estilo")} placeholder="Ej: Belgian Tripel" style={input} />
        </Field>
        <Field label="País / Región">
          <input value={form.pais} onChange={set("pais")} placeholder="Ej: España (A Coruña)" style={input} />
        </Field>
        <Field label="Graduación (%)">
          <input value={form.alcohol} onChange={set("alcohol")} type="number" min="0" max="30" step="0.1"
            placeholder="Ej: 8.4" style={{ ...input, width: 120 }} />
        </Field>

        <Field label="Rareza">
          <select value={form.rareza} onChange={set("rareza")} style={input}>
            <option value="comun">⚪ Común</option>
            <option value="poco_comun">🟢 Poco común</option>
            <option value="rara">🔵 Rara</option>
            <option value="epica">🟣 Épica</option>
            <option value="legendaria">🟡 Legendaria</option>
            <option value="mitica">🌈 Mítica</option>
          </select>
        </Field>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.es_edicion_especial}
              onChange={(e) => setForm((f) => ({ ...f, es_edicion_especial: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: "#d4af37", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "#f0e4cc", fontWeight: 600 }}>✨ Edición especial</span>
          </label>
        </div>

        {form.es_edicion_especial && (
          <Field label="Motivo / nombre de la edición">
            <input value={form.motivo_edicion} onChange={set("motivo_edicion")}
              placeholder="Ej: Navidad 2024, 25º Aniversario…" style={input} />
          </Field>
        )}

        <Field label="Foto">
          <input type="file" accept="image/*" onChange={handleFoto}
            style={{ color: "#f0e4cc", fontSize: 13 }} />
          {fotoPreview && (
            <img src={fotoPreview} alt="preview"
              style={{ marginTop: 10, height: 100, borderRadius: 8, objectFit: "cover", border: "1px solid #2e2215" }} />
          )}
        </Field>
      </div>

      {/* ── Prompt Claude ── */}
      <div style={sectionCard}>
        <p style={sectionTitle}>Asistente Claude</p>

        <button onClick={handleCopyPrompt} style={copyBtn}>
          📋 Copiar prompt para Claude
        </button>
        <p style={{ margin: "8px 0 16px", color: "#5a4535", fontSize: 12 }}>
          Pegá los datos básicos primero, luego copiá el prompt y pegalo en Claude.
        </p>

        <Field label="Descripción técnica (pegar respuesta de Claude)">
          <textarea
            value={form.info_detallada}
            onChange={set("info_detallada")}
            rows={4}
            placeholder="Pegar aquí el párrafo de descripción..."
            style={textarea}
          />
        </Field>

        <Field label="Coordenadas de origen (pegar respuesta de Claude)">
          <textarea
            value={coordsRaw}
            onChange={handleCoords}
            rows={2}
            placeholder="Ej: -34.6037, -58.3816"
            style={{ ...textarea, marginBottom: 6 }}
          />
          {coordsParsed && (
            <p style={{ margin: 0, fontSize: 13, color: "#4caf50" }}>
              ✓ Lat: {coordsParsed.lat} · Lng: {coordsParsed.lng}
            </p>
          )}
          {coordsError && (
            <p style={{ margin: 0, fontSize: 13, color: "#c07a3f" }}>{coordsError}</p>
          )}
        </Field>
      </div>

      {/* ── Guardar ── */}
      {error   && <p style={{ margin: 0, color: "#c0392b", fontSize: 14 }}>{error}</p>}
      {success && <p style={{ margin: 0, color: "#4caf50", fontSize: 14 }}>{success}</p>}

      <button onClick={handleSave} disabled={saving} style={{ ...approveBtn, padding: "13px 0", fontSize: 15, borderRadius: 10 }}>
        {saving ? "Guardando..." : "💾 Guardar cerveza"}
      </button>
    </div>
  );
};

const Field = ({ label, children, style }) => (
  <div style={{ marginBottom: 14, ...style }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const input = {
  width: "100%", padding: "9px 12px", background: "#0d0a06",
  border: "1px solid #2e2215", borderRadius: 8, color: "#f0e4cc",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

const sectionCard = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12, padding: "16px 18px",
};

const sectionTitle = {
  margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#9a7d62",
  textTransform: "uppercase", letterSpacing: "0.5px",
};

const copyBtn = {
  padding: "9px 18px", background: "rgba(212,175,55,0.1)", border: "1px solid #d4af37",
  borderRadius: 8, color: "#d4af37", fontWeight: 700, fontSize: 13, cursor: "pointer",
};

const textarea = {
  width: "100%", padding: "8px 10px", background: "#0d0a06",
  border: "1px solid #2e2215", borderRadius: 8, color: "#f0e4cc",
  fontSize: 13, resize: "vertical", outline: "none",
  boxSizing: "border-box", marginBottom: 0, fontFamily: "Inter, sans-serif",
};

// ── Sub-panel: Soporte ────────────────────────────────────────────────────────
const SupportPanel = ({ t }) => {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [notes, setNotes]       = useState({});   // { ticketId: string }
  const [saving, setSaving]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*, profiles(nombre, avatar_url)")
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (ticket) => {
    setSaving(ticket.id);
    await supabase.from("support_tickets").update({
      status:      "resolved",
      admin_note:  notes[ticket.id] ?? ticket.admin_note ?? null,
      resolved_at: new Date().toISOString(),
    }).eq("id", ticket.id);
    await load();
    setSaving(null);
  };

  const handleNoteChange = (id, val) => setNotes((n) => ({ ...n, [id]: val }));

  if (loading) return <p style={{ color: "#9a7d62", padding: 20 }}>{t("admin.loading")}</p>;
  if (tickets.length === 0) return <p style={{ color: "#5a4535", padding: 20, textAlign: "center" }}>{t("admin.ticketsEmpty")}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tickets.map((tk) => {
        const isOpen = tk.status === "open";
        const open   = expanded === tk.id;
        return (
          <div key={tk.id} style={cardStyle}>
            {/* Row header */}
            <div
              onClick={() => setExpanded(open ? null : tk.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: isOpen ? "rgba(212,175,55,0.15)" : "rgba(42,107,58,0.2)",
                color: isOpen ? "#d4af37" : "#4caf50",
                flexShrink: 0,
              }}>
                {isOpen ? t("admin.statusOpen") : t("admin.statusResolved")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: "#f0e4cc", fontSize: 14, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tk.subject}
                </span>
                <span style={{ fontSize: 12, color: "#9a7d62" }}>
                  {tk.profiles?.nombre || "?"} · {fmtDate(tk.created_at)}
                </span>
              </div>
              <span style={{ color: "#5a4535", fontSize: 14, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
            </div>

            {/* Expanded detail */}
            {open && (
              <div style={{ marginTop: 14, borderTop: "1px solid #2e2215", paddingTop: 14 }}>
                <p style={{ margin: "0 0 14px", color: "#f0e4cc", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {tk.message}
                </p>
                {tk.admin_note && !isOpen && (
                  <p style={{ margin: "0 0 10px", color: "#9a7d62", fontSize: 13, fontStyle: "italic" }}>
                    📝 {tk.admin_note}
                  </p>
                )}
                {isOpen && (
                  <>
                    <label style={labelStyle}>{t("admin.adminNote")}</label>
                    <textarea
                      rows={2}
                      value={notes[tk.id] ?? tk.admin_note ?? ""}
                      onChange={(e) => handleNoteChange(tk.id, e.target.value)}
                      placeholder={t("admin.adminNotePlaceholder")}
                      style={textareaStyle}
                    />
                    <button
                      onClick={() => handleResolve(tk)}
                      disabled={saving === tk.id}
                      style={approveBtn}
                    >
                      {saving === tk.id ? "..." : t("admin.markResolved")}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Sub-panel: Sugerencias ────────────────────────────────────────────────────
const SuggestionsPanel = ({ t }) => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("beer_suggestions")
      .select("*, profiles(nombre)")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setActing(id);
    await supabase.rpc("approve_beer_suggestion", { p_suggestion_id: id });
    await load();
    setActing(null);
  };

  const handleReject = async (id) => {
    setActing(id);
    await supabase.rpc("reject_beer_suggestion", { p_suggestion_id: id });
    await load();
    setActing(null);
  };

  if (loading) return <p style={{ color: "#9a7d62", padding: 20 }}>{t("admin.loading")}</p>;
  if (items.length === 0) return <p style={{ color: "#5a4535", padding: 20, textAlign: "center" }}>{t("admin.suggestionsEmpty")}</p>;

  const pending  = items.filter((s) => s.status === "pending");
  const reviewed = items.filter((s) => s.status !== "pending");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {pending.length === 0 && reviewed.length > 0 && (
        <p style={{ color: "#5a4535", fontSize: 13, textAlign: "center", margin: "0 0 8px" }}>
          {t("admin.noPendingSuggestions")}
        </p>
      )}

      {[...pending, ...reviewed].map((s) => {
        const isPending = s.status === "pending";
        return (
          <div key={s.id} style={cardStyle}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#f0e4cc", fontSize: 15 }}>🍺 {s.nombre}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, flexShrink: 0,
                    background: isPending ? "rgba(212,175,55,0.15)" : s.status === "approved" ? "rgba(42,107,58,0.2)" : "rgba(139,32,32,0.2)",
                    color: isPending ? "#d4af37" : s.status === "approved" ? "#4caf50" : "#c07a3f",
                  }}>
                    {t(`admin.status_${s.status}`)}
                  </span>
                </div>
                {(s.estilo || s.pais) && (
                  <p style={{ margin: "0 0 4px", color: "#9a7d62", fontSize: 13 }}>
                    {[s.estilo, s.pais].filter(Boolean).join(" · ")}
                  </p>
                )}
                {s.reason && (
                  <p style={{ margin: "0 0 6px", color: "#9a7d62", fontSize: 13, fontStyle: "italic" }}>
                    "{s.reason}"
                  </p>
                )}
                <p style={{ margin: 0, color: "#5a4535", fontSize: 12 }}>
                  {t("admin.from")}: {s.profiles?.nombre || "?"} · {fmtDate(s.created_at)}
                </p>
              </div>

              {isPending && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column" }}>
                  <button
                    onClick={() => handleApprove(s.id)}
                    disabled={acting === s.id}
                    style={approveBtn}
                  >
                    {acting === s.id ? "..." : t("admin.approve")}
                  </button>
                  <button
                    onClick={() => handleReject(s.id)}
                    disabled={acting === s.id}
                    style={rejectBtn}
                  >
                    {t("admin.reject")}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Página principal AdminPanel ────────────────────────────────────────────────
const AdminPanel = ({ profile }) => {
  const navigate = useNavigate();
  const { t }    = useTranslation();
  const [tab, setTab] = useState("support");

  useEffect(() => {
    if (profile && !profile.is_admin) navigate("/", { replace: true });
  }, [profile, navigate]);

  if (!profile?.is_admin) return null;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px", fontFamily: "'Playfair Display', serif", color: "#f0e4cc" }}>
        🔧 {t("admin.title")}
      </h2>
      <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 24px" }}>{t("admin.subtitle")}</p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #2e2215", overflowX: "auto" }}>
        {[
          { key: "support",     label: t("admin.tabSupport"),     icon: "🆘" },
          { key: "suggestions", label: t("admin.tabSuggestions"), icon: "💡" },
          { key: "cargar",      label: "Cargar Cerveza",          icon: "🍺" },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 22px", border: "none", background: "none",
              cursor: "pointer", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap",
              color: tab === key ? "#d4af37" : "#5a4535",
              borderBottom: tab === key ? "3px solid #d4af37" : "3px solid transparent",
              marginBottom: -2, transition: "all 0.15s",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === "support"     && <SupportPanel     t={t} />}
      {tab === "suggestions" && <SuggestionsPanel t={t} />}
      {tab === "cargar"      && <CargarCerveza />}
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const cardStyle = {
  background: "#1c1409", border: "1px solid #2e2215",
  borderRadius: 12, padding: "14px 16px",
};
const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#9a7d62",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6,
};
const textareaStyle = {
  width: "100%", padding: "8px 10px", background: "#0d0a06",
  border: "1px solid #2e2215", borderRadius: 8, color: "#f0e4cc",
  fontSize: 13, resize: "vertical", outline: "none",
  boxSizing: "border-box", marginBottom: 10, fontFamily: "Inter, sans-serif",
};
const approveBtn = {
  padding: "7px 16px", borderRadius: 8, border: "none",
  background: "#d4af37", color: "#0d0a06",
  fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const rejectBtn = {
  padding: "7px 16px", borderRadius: 8,
  border: "1px solid #8b2020", background: "rgba(139,32,32,0.15)",
  color: "#c07a3f", fontWeight: 700, fontSize: 13, cursor: "pointer",
};

export default AdminPanel;
