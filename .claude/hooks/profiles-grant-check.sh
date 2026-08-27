#!/bin/bash
# PostToolUse hook: cuando se edita una migración que hace
# ALTER TABLE ... ADD COLUMN sobre profiles, recuerda verificar/agregar
# el GRANT SELECT correspondiente.
#
# profiles tiene el SELECT restringido a nivel de COLUMNA desde
# 20260721020000_restrict_profiles_is_admin_column.sql (revoke de tabla
# completa + lista explícita de columnas otorgadas) — cualquier columna
# nueva que no sume su propio GRANT SELECT (columna) TO authenticated,
# anon queda invisible para el cliente y rompe la query ENTERA con 403,
# no solo esa columna. Ya pasó 3 veces (equipped_tag_slug/chapas,
# username) — este hook es el recordatorio para que no pase una cuarta.
#
# Nunca bloquea la edición (siempre exit 0), es solo informativo — igual
# que lint-check.sh / i18n-validate.sh.

input=$(cat)
file_path=$(node -e "try{console.log(JSON.parse(process.argv[1]).tool_input.file_path||'')}catch(e){console.log('')}" "$input")

[ -z "$file_path" ] && exit 0

norm_path=$(printf '%s' "$file_path" | tr '\\' '/')
case "$norm_path" in
  */supabase/migrations/*.sql) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

result=$(node -e "
  const fs = require('fs');
  const path = require('path');

  const editedFile = process.argv[1];
  const projectDir = process.argv[2];

  const content = fs.readFileSync(editedFile, 'utf8');

  // ALTER TABLE [public.]profiles ADD COLUMN [IF NOT EXISTS] <nombre> ...
  const addColRe = /ALTER\s+TABLE\s+(?:public\.)?profiles\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?\"?(\w+)\"?/gi;
  const addedCols = [...content.matchAll(addColRe)].map((m) => m[1]);
  if (addedCols.length === 0) process.exit(0);

  // Junta el contenido de TODAS las migraciones (agregar el GRANT en un
  // archivo aparte, como ya pasó con chapas/username, es el patrón
  // establecido acá — no hace falta que esté en el mismo archivo).
  const migDir = path.join(projectDir, 'supabase', 'migrations');
  let allSql = '';
  try {
    for (const f of fs.readdirSync(migDir)) {
      if (f.endsWith('.sql')) allSql += fs.readFileSync(path.join(migDir, f), 'utf8') + '\n';
    }
  } catch (e) { process.exit(0); }

  // Columnas que ya aparecen en algún GRANT SELECT (...) sobre profiles.
  const grantRe = /GRANT\s+SELECT\s*\(([^)]*)\)\s*ON\s+(?:public\.)?profiles/gi;
  const grantedCols = new Set();
  for (const m of allSql.matchAll(grantRe)) {
    for (const col of m[1].split(',')) grantedCols.add(col.trim().replace(/\"/g, ''));
  }
  // profiles_read_all / cualquier GRANT SELECT de tabla completa (sin
  // paréntesis de columnas) cubriría todo — si existe, no hay nada que
  // recordar (no es el caso hoy, pero evita falsos positivos si cambia).
  const fullTableGrant = /GRANT\s+SELECT\s+ON\s+(?:public\.)?profiles\s+TO/i.test(allSql);
  if (fullTableGrant) process.exit(0);

  const missing = addedCols.filter((c) => !grantedCols.has(c));
  if (missing.length === 0) process.exit(0);

  const list = missing.map((c) => '  - ' + c).join('\n');
  const ctx =
    '⚠️  RECORDATORIO: ' + path.basename(editedFile) + ' agrega columna(s) nueva(s) a profiles ' +
    'que todavía no tienen su GRANT SELECT:\n' + list + '\n\n' +
    'profiles tiene el SELECT restringido por columna (ver ' +
    '20260721020000_restrict_profiles_is_admin_column.sql) — sin este GRANT, ' +
    'cualquier .select() del cliente que pida esta columna falla la query ENTERA ' +
    'con 403 (ya pasó con equipped_tag_slug/chapas y con username). ' +
    'Agregá antes de terminar:\n\n' +
    'GRANT SELECT (' + missing.join(', ') + ') ON public.profiles TO authenticated, anon;\n\n' +
    '(en esta misma migración, o en una migración nueva aparte — cualquiera de las dos formas ya se usó antes en este proyecto).';

  process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext: ctx}}));
" "$file_path" "$CLAUDE_PROJECT_DIR")

if [ -n "$result" ]; then
  printf '%s' "$result"
fi

exit 0
