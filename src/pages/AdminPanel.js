import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { slugify } from "../utils/slugify";
import { translateDescription } from "../utils/translate";
import {
  QuestionIcon, LightBulbIcon, FlagIcon, BeakerIcon, PencilIcon, GoalIcon,
  ZapIcon, CopyIcon, CheckIcon, PlusIcon, ContainerIcon, TelescopeIcon, PulseIcon,
  MegaphoneIcon,
} from "@primer/octicons-react";

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
    familia: "",
  });
  const [fotoFile, setFotoFile]       = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [coordsRaw, setCoordsRaw]     = useState("");
  const [coordsParsed, setCoordsParsed] = useState(null);
  const [coordsError, setCoordsError]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [translating, setTranslating] = useState(false);
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
      const rawExt = fotoFile.name.split(".").pop() || "jpg";
      const ext    = /^[a-zA-Z0-9]+$/.test(rawExt) ? rawExt.toLowerCase() : "jpg";
      const path   = `${slugify(form.nombre.trim())}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("Cervezas")
        .upload(path, fotoFile, { upsert: true, contentType: fotoFile.type });
      if (upErr) { setError(`Error subiendo foto: ${upErr.message}`); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("Cervezas").getPublicUrl(path);
      foto_url = urlData.publicUrl;
    }

    // 2. Traducir la descripción (si hay) antes de guardar — MyMemory
    // Translate, gratis, sin key. Si falla, quedan en null: BeerInfoModal
    // cae a español en vez de mostrar vacío.
    let info_detallada_en = null;
    let info_detallada_de = null;
    const infoTrimmed = form.info_detallada.trim();
    if (infoTrimmed) {
      setTranslating(true);
      const translated = await translateDescription(infoTrimmed);
      info_detallada_en = translated.en;
      info_detallada_de = translated.de;
      setTranslating(false);
    }

    // 3. Insert en beers_new
    const row = {
      nombre:             form.nombre.trim() || null,
      estilo:             form.estilo.trim() || null,
      pais:               form.pais.trim() || null,
      alcohol:            form.alcohol !== "" ? parseFloat(form.alcohol) : null,
      info_detallada:     infoTrimmed || null,
      info_detallada_en,
      info_detallada_de,
      foto_url,
      origen_lat:         coordsParsed?.lat ?? null,
      origen_lng:         coordsParsed?.lng ?? null,
      rareza:             form.rareza,
      es_edicion_especial: form.es_edicion_especial,
      motivo_edicion:     form.motivo_edicion.trim() || null,
      familia:            form.familia.trim() || null,
    };

    const { error: dbErr } = await supabase.from("beers_new").insert(row);
    if (dbErr) { setError(`Error guardando: ${dbErr.message}`); setSaving(false); return; }

    setSuccess(`✓ "${form.nombre}" guardada correctamente.`);
    setForm({ nombre: "", estilo: "", pais: "", alcohol: "", info_detallada: "", rareza: "comun", es_edicion_especial: false, motivo_edicion: "", familia: "" });
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

        <Field label="Familia / Serie (opcional)">
          <input value={form.familia} onChange={set("familia")}
            placeholder="Ej: 1906, Belgian Quad, Trappist…" style={input} />
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#5a4535" }}>
            Agrupa cervezas en una serie para habilitar logros de &quot;serie completa&quot;.
          </p>
        </Field>

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

        <button onClick={handleCopyPrompt} style={{ ...copyBtn, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <CopyIcon size={14} /> Copiar prompt para Claude
        </button>
        <p style={{ margin: "8px 0 16px", color: "#5a4535", fontSize: 12 }}>
          Pegá los datos básicos primero, luego copiá el prompt y pegalo en Claude.
        </p>

        <Field label="Descripción técnica (pegar respuesta de Claude) — se traduce solo a EN/DE al guardar">
          <textarea
            value={form.info_detallada}
            onChange={(e) => setForm((f) => ({ ...f, info_detallada: e.target.value.slice(0, 400) }))}
            rows={4}
            maxLength={400}
            placeholder="Pegar aquí el párrafo de descripción..."
            style={textarea}
          />
          <div style={{ fontSize: 11, color: form.info_detallada.length >= 360 ? "#8b2020" : "#5a4535", textAlign: "right", marginTop: 3 }}>
            {form.info_detallada.length}/400
          </div>
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

      <button onClick={handleSave} disabled={saving} style={{ ...approveBtn, padding: "13px 0", fontSize: 15, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {translating ? "🌐 Traduciendo..." : saving ? "Guardando..." : (<><CheckIcon size={14} /> Guardar cerveza</>)}
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
  fontSize: 13, resize: "none", outline: "none",
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
                      maxLength={400}
                      value={notes[tk.id] ?? tk.admin_note ?? ""}
                      onChange={(e) => handleNoteChange(tk.id, e.target.value.slice(0, 400))}
                      placeholder={t("admin.adminNotePlaceholder")}
                      style={textareaStyle}
                    />
                    <div style={{ fontSize: 11, color: (notes[tk.id] ?? tk.admin_note ?? "").length >= 360 ? "#8b2020" : "#5a4535", textAlign: "right", margin: "3px 0 8px" }}>
                      {(notes[tk.id] ?? tk.admin_note ?? "").length}/400
                    </div>
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
      // profiles!beer_suggestions_user_id_fkey: beer_suggestions tiene dos FKs
      // a profiles (user_id y reviewed_by) — sin especificar cuál, PostgREST
      // devuelve PGRST201 (ambigüedad) y la query falla en silencio.
      .select("*, profiles!beer_suggestions_user_id_fkey(nombre)")
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

// ── Sub-panel: Copas sugeridas ─────────────────────────────────────────────────
const GLASS_RAREZA_OPTIONS = [
  { value: "comun",      label: "⚪ Común" },
  { value: "poco_comun", label: "🟢 Poco común" },
  { value: "rara",       label: "🔵 Rara" },
  { value: "epica",      label: "🟣 Épica" },
  { value: "legendaria", label: "🟡 Legendaria" },
  { value: "mitica",     label: "🌈 Mítica" },
];

const GlassSuggestionsPanel = ({ t }) => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(null);
  const [rarezaById, setRarezaById] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("glass_suggestions")
      // profiles!glass_suggestions_user_id_fkey: mismo motivo que en
      // beer_suggestions — hay dos FKs a profiles (user_id y reviewed_by).
      .select("*, profiles!glass_suggestions_user_id_fkey(nombre), beers_new(nombre)")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setActing(id);
    await supabase.rpc("approve_glass_suggestion", {
      p_suggestion_id: id,
      p_rareza: rarezaById[id] || "comun",
    });
    await load();
    setActing(null);
  };

  const handleReject = async (id) => {
    setActing(id);
    await supabase.rpc("reject_glass_suggestion", { p_suggestion_id: id });
    await load();
    setActing(null);
  };

  if (loading) return <p style={{ color: "#9a7d62", padding: 20 }}>{t("admin.loading")}</p>;
  if (items.length === 0) return <p style={{ color: "#5a4535", padding: 20, textAlign: "center" }}>{t("admin.glassesEmpty")}</p>;

  const pending  = items.filter((s) => s.status === "pending");
  const reviewed = items.filter((s) => s.status !== "pending");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {pending.length === 0 && reviewed.length > 0 && (
        <p style={{ color: "#5a4535", fontSize: 13, textAlign: "center", margin: "0 0 8px" }}>
          {t("admin.noPendingGlasses")}
        </p>
      )}

      {[...pending, ...reviewed].map((s) => {
        const isPending = s.status === "pending";
        return (
          <div key={s.id} style={cardStyle}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              {s.foto_url && (
                <img src={s.foto_url} alt={s.nombre}
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#f0e4cc", fontSize: 15 }}>🍷 {s.nombre}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, flexShrink: 0,
                    background: isPending ? "rgba(212,175,55,0.15)" : s.status === "approved" ? "rgba(42,107,58,0.2)" : "rgba(139,32,32,0.2)",
                    color: isPending ? "#d4af37" : s.status === "approved" ? "#4caf50" : "#c07a3f",
                  }}>
                    {t(`admin.status_${s.status}`)}
                  </span>
                </div>
                {s.marca && (
                  <p style={{ margin: "0 0 4px", color: "#9a7d62", fontSize: 13 }}>{s.marca}</p>
                )}
                {s.beers_new?.nombre && (
                  <p style={{ margin: "0 0 4px", color: "#8b6b2e", fontSize: 12 }}>🍺 {t("admin.associatedWith")}: {s.beers_new.nombre}</p>
                )}
                {s.descripcion && (
                  <p style={{ margin: "0 0 6px", color: "#9a7d62", fontSize: 13, fontStyle: "italic" }}>
                    "{s.descripcion}"
                  </p>
                )}
                <p style={{ margin: 0, color: "#5a4535", fontSize: 12 }}>
                  {t("admin.from")}: {s.profiles?.nombre || "?"} · {fmtDate(s.created_at)}
                </p>
              </div>

              {isPending && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column" }}>
                  <select
                    value={rarezaById[s.id] || "comun"}
                    onChange={(e) => setRarezaById((r) => ({ ...r, [s.id]: e.target.value }))}
                    style={{ ...ctrlSelectStyle, marginBottom: 2 }}
                  >
                    {GLASS_RAREZA_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
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

// ── Sub-panel: Reportes (anti-trampa) ──────────────────────────────────────────
const SOURCE_META = {
  duplicate_photo:  { icon: "🪞", color: "#c07a3f", labelKey: "admin.reportSourceDuplicate" },
  velocity:         { icon: "⚡", color: "#4a90d9", labelKey: "admin.reportSourceVelocity" },
  community_report: { icon: "🚩", color: "#8b2020", labelKey: "admin.reportSourceCommunity" },
};

const ReportsPanel = ({ t }) => {
  const [flags, setFlags]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("entry_flags")
      .select(`
        *,
        reported_profile:profiles!entry_flags_user_id_fkey(nombre, avatar_url),
        reporter_profile:profiles!entry_flags_reporter_id_fkey(nombre),
        beers_new(nombre, foto_url)
      `)
      .order("created_at", { ascending: false });
    setFlags(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDismiss = async (flag) => {
    setActing(flag.id);
    await supabase.from("entry_flags").update({
      status:      "dismissed",
      reviewed_at: new Date().toISOString(),
    }).eq("id", flag.id);
    await load();
    setActing(null);
  };

  const handleUnverify = async (flag) => {
    setActing(flag.id);
    await supabase.rpc("admin_unverify_entry", { p_flag_id: flag.id });
    await load();
    setActing(null);
  };

  if (loading) return <p style={{ color: "#9a7d62", padding: 20 }}>{t("admin.loading")}</p>;
  if (flags.length === 0) return <p style={{ color: "#5a4535", padding: 20, textAlign: "center" }}>{t("admin.reportsEmpty")}</p>;

  const pending  = flags.filter((f) => f.status === "pending");
  const reviewed = flags.filter((f) => f.status !== "pending");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {pending.length === 0 && reviewed.length > 0 && (
        <p style={{ color: "#5a4535", fontSize: 13, textAlign: "center", margin: "0 0 8px" }}>
          {t("admin.noPendingReports")}
        </p>
      )}

      {[...pending, ...reviewed].map((f) => {
        const isPending = f.status === "pending";
        const meta = SOURCE_META[f.source] || SOURCE_META.community_report;
        return (
          <div key={f.id} style={cardStyle}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, flexShrink: 0,
                    background: `${meta.color}26`, color: meta.color,
                  }}>
                    {meta.icon} {t(meta.labelKey)}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, flexShrink: 0,
                    background: isPending ? "rgba(212,175,55,0.15)" : f.status === "confirmed" ? "rgba(139,32,32,0.2)" : "rgba(42,107,58,0.2)",
                    color: isPending ? "#d4af37" : f.status === "confirmed" ? "#c07a3f" : "#4caf50",
                  }}>
                    {t(`admin.status_${f.status}`)}
                  </span>
                </div>

                <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#f0e4cc", fontSize: 14 }}>
                  {f.reported_profile?.nombre || "?"} — 🍺 {f.beers_new?.nombre || `#${f.beer_id}`}
                </p>
                {f.reason && (
                  <p style={{ margin: "0 0 6px", color: "#9a7d62", fontSize: 13, fontStyle: "italic" }}>
                    "{f.reason}"
                  </p>
                )}
                <p style={{ margin: 0, color: "#5a4535", fontSize: 12 }}>
                  {f.source === "community_report" && (
                    <>{t("admin.reportedBy")}: {f.reporter_profile?.nombre || "?"} · </>
                  )}
                  {fmtDate(f.created_at)}
                </p>
              </div>

              {isPending && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column" }}>
                  <button
                    onClick={() => handleUnverify(f)}
                    disabled={acting === f.id}
                    style={rejectBtn}
                  >
                    {acting === f.id ? "..." : t("admin.unverify")}
                  </button>
                  <button
                    onClick={() => handleDismiss(f)}
                    disabled={acting === f.id}
                    style={approveBtn}
                  >
                    {t("admin.dismiss")}
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

// ── Sub-panel: Editar Cerveza ─────────────────────────────────────────────────
const EditarCerveza = () => {
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [form,         setForm]         = useState(null);
  const [fotoFile,     setFotoFile]     = useState(null);
  const [fotoPreview,  setFotoPreview]  = useState(null);
  const [coordsRaw,    setCoordsRaw]    = useState("");
  const [coordsParsed, setCoordsParsed] = useState(null);
  const [coordsError,  setCoordsError]  = useState("");
  const [saving,       setSaving]       = useState(false);
  const [translating,  setTranslating]  = useState(false);
  const [msg,          setMsg]          = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    const { data } = await supabase
      .from("beers_new")
      .select("id, nombre, estilo, pais, alcohol, rareza, es_edicion_especial, motivo_edicion, familia, info_detallada, info_detallada_en, info_detallada_de, foto_url, origen_lat, origen_lng")
      .ilike("nombre", `%${q.trim()}%`)
      .order("nombre")
      .limit(20);
    setResults(data || []);
  };

  const handleSelect = (beer) => {
    setSelected(beer);
    setForm({
      nombre:              beer.nombre              || "",
      estilo:              beer.estilo              || "",
      pais:                beer.pais                || "",
      alcohol:             beer.alcohol != null ? String(beer.alcohol) : "",
      rareza:              beer.rareza              || "comun",
      es_edicion_especial: beer.es_edicion_especial ?? false,
      motivo_edicion:      beer.motivo_edicion      || "",
      familia:             beer.familia             || "",
      info_detallada:      beer.info_detallada      || "",
    });
    if (beer.origen_lat != null && beer.origen_lng != null) {
      const raw = `${beer.origen_lat}, ${beer.origen_lng}`;
      setCoordsRaw(raw);
      setCoordsParsed({ lat: beer.origen_lat, lng: beer.origen_lng });
    } else {
      setCoordsRaw(""); setCoordsParsed(null);
    }
    setCoordsError("");
    setFotoFile(null); setFotoPreview(null);
    setResults([]);
    setQuery(beer.nombre);
    setMsg("");
  };

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
      `Devolvé:\n1) Un párrafo breve técnico de la cerveza (sabor, aroma, color, maridaje).\n` +
      `2) Las coordenadas de origen en formato: lat, lng (solo los dos números con signo negativo si corresponde, separados por coma).`;
    navigator.clipboard.writeText(prompt).catch(() => {});
  };

  const handleSave = async () => {
    if (!selected || !form) return;
    if (!form.nombre.trim()) { setMsg("❌ El nombre es obligatorio."); return; }
    setSaving(true); setMsg("");

    // Upload nueva foto si la hay
    let foto_url = selected.foto_url;
    if (fotoFile) {
      const rawExt = fotoFile.name.split(".").pop() || "jpg";
      const ext    = /^[a-zA-Z0-9]+$/.test(rawExt) ? rawExt.toLowerCase() : "jpg";
      const path   = `${slugify(form.nombre.trim())}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("Cervezas")
        .upload(path, fotoFile, { upsert: true, contentType: fotoFile.type });
      if (upErr) { setMsg(`❌ Error subiendo foto: ${upErr.message}`); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("Cervezas").getPublicUrl(path);
      foto_url = urlData.publicUrl;
    }

    // Solo vuelve a traducir si el texto en español realmente cambió
    // respecto al que ya estaba guardado — así no gasta cupo de la API
    // en cada guardado que no toca la descripción.
    const infoTrimmed = form.info_detallada.trim();
    let info_detallada_en = selected.info_detallada_en ?? null;
    let info_detallada_de = selected.info_detallada_de ?? null;
    if (infoTrimmed !== (selected.info_detallada || "")) {
      if (infoTrimmed) {
        setTranslating(true);
        const translated = await translateDescription(infoTrimmed);
        info_detallada_en = translated.en;
        info_detallada_de = translated.de;
        setTranslating(false);
      } else {
        info_detallada_en = null;
        info_detallada_de = null;
      }
    }

    const { error } = await supabase.from("beers_new").update({
      nombre:              form.nombre.trim()         || null,
      estilo:              form.estilo.trim()         || null,
      pais:                form.pais.trim()           || null,
      alcohol:             form.alcohol !== "" ? parseFloat(form.alcohol) : null,
      rareza:              form.rareza,
      es_edicion_especial: form.es_edicion_especial,
      motivo_edicion:      form.motivo_edicion.trim() || null,
      familia:             form.familia.trim()        || null,
      info_detallada:      infoTrimmed || null,
      info_detallada_en,
      info_detallada_de,
      foto_url,
      origen_lat:          coordsParsed?.lat ?? null,
      origen_lng:          coordsParsed?.lng ?? null,
    }).eq("id", selected.id);

    setSaving(false);
    if (error) { setMsg(`❌ Error: ${error.message}`); return; }
    setMsg(`✓ "${form.nombre.trim()}" actualizada correctamente.`);
    setSelected((s) => ({ ...s, ...form, foto_url, info_detallada_en, info_detallada_de, origen_lat: coordsParsed?.lat ?? null, origen_lng: coordsParsed?.lng ?? null }));
    setFotoFile(null); setFotoPreview(null);
  };

  return (
    <div style={{ maxWidth: 580 }}>
      <p style={{ margin: "0 0 12px", color: "#9a7d62", fontSize: 13 }}>
        Buscá una cerveza existente y editá cualquiera de sus campos.
      </p>

      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: form ? 20 : 4 }}>
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar cerveza por nombre…"
          style={input}
        />
        {results.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
            background: "#1c1409", border: "1px solid #2e2215", borderRadius: "0 0 10px 10px",
            maxHeight: 260, overflowY: "auto",
          }}>
            {results.map((b) => (
              <div key={b.id} onClick={() => handleSelect(b)}
                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #2e2215", fontSize: 14, color: "#f0e4cc", transition: "background 0.1s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#2a1e0f"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <strong>{b.nombre}</strong>
                {b.estilo && <span style={{ color: "#9a7d62", marginLeft: 8, fontSize: 12 }}>{b.estilo}</span>}
                <span style={{ float: "right", fontSize: 11, color: "#5a4535" }}>{b.rareza}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario completo */}
      {form && selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#9a7d62", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Editando: <span style={{ color: "#d4af37", textTransform: "none", letterSpacing: "normal", fontWeight: 700 }}>{selected.nombre}</span>
            <span style={{ color: "#5a4535", fontWeight: 400 }}> — ID #{selected.id}</span>
          </p>

          {/* ── Datos básicos ── */}
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

            <Field label="Familia / Serie (opcional)">
              <input value={form.familia} onChange={set("familia")}
                placeholder="Ej: 1906, Belgian Quad, Trappist…" style={input} />
            </Field>

            <Field label="Foto">
              {selected.foto_url && !fotoPreview && (
                <div style={{ marginBottom: 10 }}>
                  <img src={selected.foto_url} alt={selected.nombre}
                    style={{ height: 100, borderRadius: 8, objectFit: "cover", border: "1px solid #2e2215", display: "block", marginBottom: 5 }} />
                  <span style={{ fontSize: 11, color: "#5a4535" }}>Foto actual — subí un archivo nuevo para reemplazarla</span>
                </div>
              )}
              {!selected.foto_url && !fotoPreview && (
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#c07a3f" }}>⚠️ Esta cerveza no tiene foto</p>
              )}
              <input type="file" accept="image/*" onChange={handleFoto} style={{ color: "#f0e4cc", fontSize: 13 }} />
              {fotoPreview && (
                <img src={fotoPreview} alt="preview"
                  style={{ marginTop: 10, height: 100, borderRadius: 8, objectFit: "cover", border: "1px solid #2e2215", display: "block" }} />
              )}
            </Field>
          </div>

          {/* ── Claude + descripción + coords ── */}
          <div style={sectionCard}>
            <p style={sectionTitle}>Asistente Claude</p>

            <button onClick={handleCopyPrompt} style={{ ...copyBtn, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CopyIcon size={14} /> Copiar prompt para Claude
            </button>
            <p style={{ margin: "8px 0 16px", color: "#5a4535", fontSize: 12 }}>
              Usá el prompt para obtener descripción técnica y coordenadas actualizadas.
            </p>

            <Field label="Descripción técnica">
              <textarea value={form.info_detallada}
                onChange={(e) => setForm((f) => ({ ...f, info_detallada: e.target.value.slice(0, 400) }))}
                rows={4} maxLength={400} placeholder="Pegar aquí el párrafo de descripción..." style={textarea} />
              <div style={{ fontSize: 11, color: form.info_detallada.length >= 360 ? "#8b2020" : "#5a4535", textAlign: "right", marginTop: 3 }}>
                {form.info_detallada.length}/400
              </div>
            </Field>

            <Field label="Coordenadas de origen">
              <textarea value={coordsRaw} onChange={handleCoords}
                rows={2} placeholder="Ej: -34.6037, -58.3816" style={{ ...textarea, marginBottom: 6 }} />
              {coordsParsed && (
                <p style={{ margin: 0, fontSize: 13, color: "#4caf50" }}>
                  ✓ Lat: {coordsParsed.lat} · Lng: {coordsParsed.lng}
                </p>
              )}
              {coordsError && <p style={{ margin: 0, fontSize: 13, color: "#c07a3f" }}>{coordsError}</p>}
            </Field>
          </div>

          {msg && (
            <p style={{ margin: 0, fontSize: 13, color: msg.startsWith("✓") ? "#4caf50" : "#c0392b" }}>{msg}</p>
          )}

          <button onClick={handleSave} disabled={saving}
            style={{ ...approveBtn, width: "100%", padding: "13px 0", fontSize: 15, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {translating ? "🌐 Traduciendo..." : saving ? "Guardando…" : (<><CheckIcon size={14} /> Guardar cambios</>)}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Sub-panel: Reto Semanal ───────────────────────────────────────────────────
// Mismas 15 métricas que ya usa validate_user_achievement() (sin Racha, que no
// tiene sentido acotada a una semana) — ver compute_metric_for_user() en
// 20260723040000_weekly_challenges.sql.
// activity: true → disponible también en scope "actividad" (describe qué le
// hacés a una entrada, da igual si es vieja o nueva). Las que faltan ese flag
// son inherentemente sobre el conjunto de cervezas que ya conocés (colección/
// países/estilos distintos/XP/amigos) — re-tocar algo que ya tenías no
// "descubre" nada, tiene sentido que sigan siendo solo de descubrimiento.
const METRIC_OPTIONS = [
  { value: "totalBeers",                label: "Cervezas registradas (total)",              activity: true },
  { value: "verifiedBeers",             label: "Cervezas verificadas (con foto)",           activity: true },
  { value: "beersWithComments",         label: "Cervezas con comentario",                    activity: true },
  { value: "verifiedWithRatings",       label: "Cervezas verificadas con puntuación",       activity: true },
  { value: "completeEntries",           label: "Entradas completas (foto + nota + puntuación)", activity: true },
  { value: "verifiedDistinctCountries", label: "Países distintos (verificadas)" },
  { value: "verifiedDistinctStyles",    label: "Estilos distintos (verificadas)" },
  { value: "beersWithLocation",         label: "Cervezas con ubicación",                     activity: true },
  { value: "coleccionCount",            label: "Cervezas de colección (rara o más)" },
  { value: "coleccionEpica",            label: "Cervezas épicas" },
  { value: "coleccionLegendaria",       label: "Cervezas legendarias" },
  { value: "coleccionMitica",           label: "Cervezas míticas" },
  { value: "coleccionEdicionEspecial",  label: "Cervezas de edición especial" },
  { value: "totalXP",                   label: "XP ganado" },
  { value: "friendCount",               label: "Amigos agregados" },
];

const DURATION_OPTIONS = [
  { value: "diario",  label: "Diario",  Icon: ZapIcon },
  { value: "semanal", label: "Semanal", Icon: GoalIcon },
];

// discovery: registrar algo NUEVO (se agota con un catálogo finito, tiene
// sentido que sea más raro/semanal). activity: hacer algo en CUALQUIER
// entrada, nueva o vieja (comentar, valorar, subir foto) — nunca se agota,
// usa activity_log en vez de user_beers.created_at (ver compute_metric_for_user).
const SCOPE_OPTIONS = [
  { value: "discovery", label: "Descubrimiento", Icon: TelescopeIcon },
  { value: "activity",  label: "Actividad",      Icon: PulseIcon },
];

const EMPTY_RETO_FORM = {
  nombre: "", descripcion: "", metric: "totalBeers", threshold: "3", xp_bonus: "50",
  fecha_inicio: "", fecha_fin: "", duration_type: "semanal", metric_scope: "discovery",
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const retoStatus = (r) => {
  const today = todayISO();
  if (r.fecha_fin < today) return { label: "Finalizado", color: "#5a4535" };
  if (r.fecha_inicio > today) return { label: "Programado", color: "#8b6b2e" };
  return { label: "Activo ahora", color: "#4caf50" };
};

const RetosPanel = () => {
  const [form, setForm]           = useState(EMPTY_RETO_FORM);
  const [editingId, setEditingId] = useState(null);
  const [retos, setRetos]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("weekly_challenges")
      .select("*")
      .order("fecha_inicio", { ascending: false });
    setRetos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const resetForm = () => { setForm(EMPTY_RETO_FORM); setEditingId(null); };

  const handleEdit = (r) => {
    setForm({
      nombre: r.nombre, descripcion: r.descripcion || "",
      metric: r.metric, threshold: String(r.threshold), xp_bonus: String(r.xp_bonus),
      fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, duration_type: r.duration_type,
      metric_scope: r.metric_scope || "discovery",
    });
    setEditingId(r.id);
    setMsg("");
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("weekly_challenges").delete().eq("id", id);
    if (error) { setMsg(`✕ No se pudo borrar: ${error.message}`); return; }
    if (editingId === id) resetForm();
    load();
  };

  const handleSave = async () => {
    setMsg("");
    if (!form.nombre.trim()) { setMsg("✕ El nombre no puede estar vacío."); return; }
    if (!form.fecha_inicio || !form.fecha_fin) { setMsg("✕ Completá fecha de inicio y fin."); return; }
    if (form.fecha_fin < form.fecha_inicio) { setMsg("✕ La fecha de fin no puede ser anterior al inicio."); return; }
    const threshold = parseInt(form.threshold, 10);
    const xpBonus   = parseInt(form.xp_bonus, 10);
    if (!threshold || threshold <= 0) { setMsg("✕ El umbral tiene que ser mayor a 0."); return; }
    if (!xpBonus || xpBonus <= 0)     { setMsg("✕ El XP de recompensa tiene que ser mayor a 0."); return; }

    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      metric: form.metric,
      threshold,
      xp_bonus: xpBonus,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      duration_type: form.duration_type,
      metric_scope: form.metric_scope,
    };

    const { error } = editingId
      ? await supabase.from("weekly_challenges").update(payload).eq("id", editingId)
      : await supabase.from("weekly_challenges").insert(payload);

    setSaving(false);
    if (error) {
      setMsg(
        error.code === "23P01"
          ? `✕ Las fechas se solapan con otro reto ${form.duration_type} ya creado.`
          : `✕ ${error.message}`
      );
      return;
    }
    setMsg(editingId ? "✓ Reto actualizado." : "✓ Reto creado.");
    resetForm();
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={sectionCard}>
        <h3 style={sectionTitle}>{editingId ? "Editar reto" : "Nuevo reto"}</h3>

        <Field label="Duración">
          <div style={{ display: "flex", gap: 10 }}>
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setField("duration_type", d.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
                  border: `1px solid ${form.duration_type === d.value ? "#d4af37" : "#2e2215"}`,
                  background: form.duration_type === d.value ? "rgba(212,175,55,0.12)" : "#0d0a06",
                  color: form.duration_type === d.value ? "#d4af37" : "#9a7d62",
                }}
              >
                <d.Icon size={14} /> {d.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Alcance">
          <div style={{ display: "flex", gap: 10 }}>
            {SCOPE_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  setForm((f) => {
                    const stillValid = s.value !== "activity" || METRIC_OPTIONS.find((m) => m.value === f.metric)?.activity;
                    return { ...f, metric_scope: s.value, metric: stillValid ? f.metric : "totalBeers" };
                  });
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
                  border: `1px solid ${form.metric_scope === s.value ? "#d4af37" : "#2e2215"}`,
                  background: form.metric_scope === s.value ? "rgba(212,175,55,0.12)" : "#0d0a06",
                  color: form.metric_scope === s.value ? "#d4af37" : "#9a7d62",
                }}
              >
                <s.Icon size={14} /> {s.label}
              </button>
            ))}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#5a4535" }}>
            {form.metric_scope === "activity"
              ? "Cuenta cualquier entrada tocada en el rango de fechas, nueva o vieja (comentar/valorar/subir foto)."
              : "Solo cuenta cervezas registradas por PRIMERA VEZ dentro del rango de fechas."}
          </p>
        </Field>

        <Field label="Nombre">
          <input value={form.nombre} onChange={(e) => setField("nombre", e.target.value)}
            maxLength={100} style={input} placeholder="Ej: Explorador de estilos" />
        </Field>

        <Field label="Descripción (se muestra a los usuarios)">
          {/* 300, no 400: weekly_challenges_descripcion_check en la base tope a
              300 — subir esto a 400 sin migrar la constraint rompería el save. */}
          <textarea value={form.descripcion} onChange={(e) => setField("descripcion", e.target.value.slice(0, 300))}
            rows={2} maxLength={300} style={textarea} placeholder="Ej: Probá 3 estilos distintos esta semana" />
          <div style={{ fontSize: 11, color: form.descripcion.length >= 270 ? "#8b2020" : "#5a4535", textAlign: "right", marginTop: 3 }}>
            {form.descripcion.length}/300
          </div>
        </Field>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field label="Métrica" style={{ flex: "1 1 220px" }}>
            <select value={form.metric} onChange={(e) => setField("metric", e.target.value)} style={input}>
              {METRIC_OPTIONS
                .filter((m) => form.metric_scope !== "activity" || m.activity)
                .map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Umbral" style={{ flex: "1 1 100px" }}>
            <input type="number" min="1" value={form.threshold}
              onChange={(e) => setField("threshold", e.target.value)} style={input} />
          </Field>
          <Field label="XP de recompensa" style={{ flex: "1 1 120px" }}>
            <input type="number" min="1" value={form.xp_bonus}
              onChange={(e) => setField("xp_bonus", e.target.value)} style={input} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field label="Fecha de inicio" style={{ flex: "1 1 160px" }}>
            <input type="date" value={form.fecha_inicio}
              onChange={(e) => setField("fecha_inicio", e.target.value)} style={input} />
          </Field>
          <Field label="Fecha de fin" style={{ flex: "1 1 160px" }}>
            <input type="date" value={form.fecha_fin}
              onChange={(e) => setField("fecha_fin", e.target.value)} style={input} />
          </Field>
        </div>

        {msg && <p style={{ margin: "0 0 12px", fontSize: 13, color: msg.startsWith("✓") ? "#4caf50" : "#c0392b" }}>{msg}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...approveBtn, display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? "Guardando…" : editingId ? (<><CheckIcon size={14} /> Guardar cambios</>) : (<><PlusIcon size={14} /> Crear reto</>)}
          </button>
          {editingId && (
            <button onClick={resetForm} style={rejectBtn}>Cancelar edición</button>
          )}
        </div>
      </div>

      <div>
        <h3 style={sectionTitle}>Historial de retos</h3>
        {loading ? (
          <p style={{ color: "#9a7d62", fontSize: 13 }}>Cargando…</p>
        ) : retos.length === 0 ? (
          <p style={{ color: "#5a4535", fontSize: 13 }}>Todavía no creaste ningún reto.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {retos.map((r) => {
              const status = retoStatus(r);
              const ScopeIcon = (SCOPE_OPTIONS.find((s) => s.value === (r.metric_scope || "discovery")) || SCOPE_OPTIONS[0]).Icon;
              return (
                <div key={r.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, color: "#f0e4cc", fontSize: 14 }}>
                      {r.duration_type === "diario" ? "⚡" : "🎯"} {r.nombre}
                    </div>
                    <div style={{ fontSize: 12, color: "#9a7d62", marginTop: 2, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <ScopeIcon size={12} />
                      {METRIC_OPTIONS.find((m) => m.value === r.metric)?.label || r.metric} · umbral {r.threshold} · +{r.xp_bonus} XP
                    </div>
                    <div style={{ fontSize: 11, color: "#5a4535", marginTop: 2 }}>
                      {r.fecha_inicio} → {r.fecha_fin}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</span>
                  <button onClick={() => handleEdit(r)} style={{ ...copyBtn, padding: "6px 12px", fontSize: 12 }}>Editar</button>
                  <button onClick={() => handleDelete(r.id)} style={{ ...rejectBtn, padding: "6px 12px", fontSize: 12 }}>Borrar</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-panel: Noticias ──────────────────────────────────────────────────────
const NEWS_CATEGORY_OPTIONS = [
  { value: "general", label: "General",         emoji: "🍺" },
  { value: "redes",   label: "Redes Sociales",  emoji: "📱" },
];

const EMPTY_NEWS_FORM = {
  title: "", body: "", link_url: "", category: "general", published_at: todayISO(),
};

const NoticiasPanel = () => {
  const [form, setForm]           = useState(EMPTY_NEWS_FORM);
  const [editingId, setEditingId] = useState(null);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("news")
      .select("*")
      .order("published_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const resetForm = () => { setForm(EMPTY_NEWS_FORM); setEditingId(null); };

  const handleEdit = (n) => {
    setForm({
      title: n.title, body: n.body, link_url: n.link_url || "",
      category: n.category, published_at: n.published_at,
    });
    setEditingId(n.id);
    setMsg("");
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (error) { setMsg(`✕ No se pudo borrar: ${error.message}`); return; }
    if (editingId === id) resetForm();
    load();
  };

  const handleSave = async () => {
    setMsg("");
    if (!form.title.trim()) { setMsg("✕ El título no puede estar vacío."); return; }
    if (!form.body.trim())  { setMsg("✕ El texto no puede estar vacío."); return; }
    if (!form.published_at) { setMsg("✕ Completá la fecha."); return; }
    if (form.link_url.trim() && !/^https?:\/\//i.test(form.link_url.trim())) {
      setMsg("✕ El enlace tiene que empezar con http:// o https://.");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      link_url: form.link_url.trim() || null,
      category: form.category,
      published_at: form.published_at,
    };

    const { error } = editingId
      ? await supabase.from("news").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingId)
      : await supabase.from("news").insert(payload);

    setSaving(false);
    if (error) { setMsg(`✕ ${error.message}`); return; }
    setMsg(editingId ? "✓ Noticia actualizada." : "✓ Noticia creada.");
    resetForm();
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={sectionCard}>
        <h3 style={sectionTitle}>{editingId ? "Editar noticia" : "Nueva noticia"}</h3>

        <Field label="Categoría">
          <div style={{ display: "flex", gap: 10 }}>
            {NEWS_CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setField("category", c.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
                  border: `1px solid ${form.category === c.value ? "#d4af37" : "#2e2215"}`,
                  background: form.category === c.value ? "rgba(212,175,55,0.12)" : "#0d0a06",
                  color: form.category === c.value ? "#d4af37" : "#9a7d62",
                }}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Título">
          <input value={form.title} onChange={(e) => setField("title", e.target.value)}
            maxLength={120} style={input} placeholder="Ej: Nueva cerveza de temporada disponible" />
        </Field>

        <Field label="Texto breve">
          <textarea value={form.body} onChange={(e) => setField("body", e.target.value.slice(0, 400))}
            rows={3} maxLength={400} style={textarea} placeholder="Contá la novedad en pocas líneas" />
          <div style={{ fontSize: 11, color: form.body.length >= 370 ? "#8b2020" : "#5a4535", textAlign: "right", marginTop: 3 }}>
            {form.body.length}/400
          </div>
        </Field>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field label="Enlace (opcional)" style={{ flex: "1 1 220px" }}>
            <input value={form.link_url} onChange={(e) => setField("link_url", e.target.value)}
              style={input} placeholder="https://..." />
          </Field>
          <Field label="Fecha" style={{ flex: "1 1 160px" }}>
            <input type="date" value={form.published_at}
              onChange={(e) => setField("published_at", e.target.value)} style={input} />
          </Field>
        </div>

        {msg && <p style={{ margin: "0 0 12px", fontSize: 13, color: msg.startsWith("✓") ? "#4caf50" : "#c0392b" }}>{msg}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...approveBtn, display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? "Guardando…" : editingId ? (<><CheckIcon size={14} /> Guardar cambios</>) : (<><PlusIcon size={14} /> Publicar noticia</>)}
          </button>
          {editingId && (
            <button onClick={resetForm} style={rejectBtn}>Cancelar edición</button>
          )}
        </div>
      </div>

      <div>
        <h3 style={sectionTitle}>Noticias publicadas</h3>
        {loading ? (
          <p style={{ color: "#9a7d62", fontSize: 13 }}>Cargando…</p>
        ) : items.length === 0 ? (
          <p style={{ color: "#5a4535", fontSize: 13 }}>Todavía no publicaste ninguna noticia.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((n) => {
              const cat = NEWS_CATEGORY_OPTIONS.find((c) => c.value === n.category) || NEWS_CATEGORY_OPTIONS[0];
              return (
                <div key={n.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, color: "#f0e4cc", fontSize: 14 }}>
                      {cat.emoji} {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: "#9a7d62", marginTop: 2 }}>
                      {cat.label} · {n.published_at}
                    </div>
                  </div>
                  <button onClick={() => handleEdit(n)} style={{ ...copyBtn, padding: "6px 12px", fontSize: 12 }}>Editar</button>
                  <button onClick={() => handleDelete(n.id)} style={{ ...rejectBtn, padding: "6px 12px", fontSize: 12 }}>Borrar</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
          { key: "support",     label: t("admin.tabSupport"),     Icon: QuestionIcon },
          { key: "suggestions", label: t("admin.tabSuggestions"), Icon: LightBulbIcon },
          { key: "glasses",     label: t("admin.tabGlasses"),     Icon: ContainerIcon },
          { key: "reportes",    label: t("admin.tabReports"),     Icon: FlagIcon },
          { key: "cargar",      label: "Cargar Cerveza",          Icon: BeakerIcon },
          { key: "editar",      label: "Editar Cerveza",          Icon: PencilIcon },
          { key: "retos",       label: "Reto Semanal",            Icon: GoalIcon },
          { key: "noticias",    label: "Noticias",                Icon: MegaphoneIcon },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="config-tab"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 22px", border: "none", background: "none",
              cursor: "pointer", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap",
              color: tab === key ? "#d4af37" : "#5a4535",
              borderBottom: tab === key ? "3px solid #d4af37" : "3px solid transparent",
              marginBottom: -2, transition: "all 0.15s",
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "support"     && <SupportPanel     t={t} />}
      {tab === "suggestions" && <SuggestionsPanel      t={t} />}
      {tab === "glasses"     && <GlassSuggestionsPanel t={t} />}
      {tab === "reportes"    && <ReportsPanel          t={t} />}
      {tab === "cargar"      && <CargarCerveza />}
      {tab === "editar"      && <EditarCerveza />}
      {tab === "retos"       && <RetosPanel />}
      {tab === "noticias"    && <NoticiasPanel />}
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
  fontSize: 13, resize: "none", outline: "none",
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
const ctrlSelectStyle = {
  padding: "5px 8px", borderRadius: 6, border: "1px solid #2e2215",
  background: "#0d0a06", color: "#f0e4cc", fontSize: 12, cursor: "pointer",
};

export default AdminPanel;
