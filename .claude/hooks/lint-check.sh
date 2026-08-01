#!/bin/bash
# PostToolUse hook: corre eslint sobre el archivo .js/.jsx recién editado
# y le muestra el resultado a Claude via additionalContext. Nunca bloquea
# la edición (siempre exit 0), es solo informativo.
# Usa node en vez de jq para parsear/armar JSON (jq no está garantizado
# en el entorno; node sí, es el proyecto).

input=$(cat)
file_path=$(node -e "try{console.log(JSON.parse(process.argv[1]).tool_input.file_path||'')}catch(e){console.log('')}" "$input")

[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.js|*.jsx) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

# El grep -v filtra el ruido de "Browserslist desactualizado" que npx eslint
# imprime siempre (no es un problema de lint real, es de caniuse-lite).
lint_output=$(cd "$CLAUDE_PROJECT_DIR" && npx eslint "$file_path" 2>&1 \
  | grep -v "Browserslist:" \
  | grep -v "update-browserslist-db" \
  | grep -v "Why you should do it regularly" \
  | sed '/^[[:space:]]*$/d')

if [ -n "$lint_output" ]; then
  printf '%s' "$lint_output" | node -e "
    const path = process.argv[1];
    let d = '';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      const ctx = 'ESLint encontró problemas en ' + path + ':\n\n' + d;
      process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext: ctx}}));
    });
  " "$file_path"
fi

exit 0
