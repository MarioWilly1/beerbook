#!/bin/bash
# PostToolUse hook: valida que un archivo de traducción editado
# (src/locales/<lang>/translation.json) siga siendo JSON válido.
# Nunca bloquea la edición (siempre exit 0), es solo informativo.
# Usa node en vez de jq para parsear/armar JSON (jq no está garantizado
# en el entorno; node sí, es el proyecto).

input=$(cat)
file_path=$(node -e "try{console.log(JSON.parse(process.argv[1]).tool_input.file_path||'')}catch(e){console.log('')}" "$input")

[ -z "$file_path" ] && exit 0

norm_path=$(printf '%s' "$file_path" | tr '\\' '/')
case "$norm_path" in
  */locales/*/translation.json) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

error_output=$(node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$file_path" 2>&1)

if [ $? -ne 0 ]; then
  printf '%s' "$error_output" | node -e "
    const path = process.argv[1];
    let d = '';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      const ctx = 'El archivo de traducción ' + path + ' quedó con JSON inválido:\n\n' + d;
      process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext: ctx}}));
    });
  " "$file_path"
fi

exit 0
