#!/usr/bin/env bash
# Remove TODAS as instalacoes/caches do plugin tray-api desta maquina,
# preservando apenas o repositorio de desenvolvimento (--keep).
#
# Cobre:
#   - Comandos oficiais "claude plugin uninstall" e
#     "claude plugin marketplace remove" quando disponiveis.
#   - Registros em ~/.claude/plugins/installed_plugins.json e
#     ~/.claude/plugins/known_marketplaces.json (jq).
#   - Secao [marketplaces.tray-plugins] em ~/.codex/config.toml.
#   - Diretorios fisicos: cache do Claude, marketplace clonado, cache do
#     Codex e clones soltos em ~/projetos.
#   - Submodulos orfaos em ~/projetos/*/.git/modules/.
#   - Itens da lixeira do GNOME (~/.local/share/Trash) cujo nome
#     contenha "tray-plugin" ou "tray-api".
#
# Sempre cria backup .bak-<timestamp> dos arquivos editados.

set -euo pipefail

PLUGIN_NAME="tray-api"
MARKETPLACE_NAME="tray-plugins"
KEEP_PATH_DEFAULT="$HOME/projetos/tray-api-claude-plugin"

KEEP_PATH="$KEEP_PATH_DEFAULT"
DRY_RUN=0
ASSUME_YES=0

usage() {
  cat <<EOF
Uso: $0 [opcoes]

Opcoes:
  --dry-run            Apenas lista o que seria removido (nao escreve nada)
  -y, --yes            Pula a confirmacao interativa
  --keep <path>        Caminho a preservar (default: ${KEEP_PATH_DEFAULT})
  -h, --help           Mostra esta mensagem

Exemplos:
  $0 --dry-run
  $0 --yes
  $0 --keep /home/me/projetos/tray-api-claude-plugin
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -y|--yes)  ASSUME_YES=1; shift ;;
    --keep)
      [[ $# -ge 2 ]] || { echo "--keep requer um caminho" >&2; exit 1; }
      KEEP_PATH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opcao desconhecida: $1" >&2; usage; exit 1 ;;
  esac
done

KEEP_PATH="$(realpath -m "$KEEP_PATH")"

if [[ ! -d "$KEEP_PATH" ]]; then
  echo "ERRO: caminho preservado nao existe: $KEEP_PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERRO: 'jq' nao encontrado no PATH (necessario para editar JSONs)" >&2
  exit 1
fi

# ---- saida bonita -----------------------------------------------------------
if [[ -t 1 ]]; then
  C_RED=$'\e[31m'; C_GREEN=$'\e[32m'; C_YELLOW=$'\e[33m'
  C_BLUE=$'\e[34m'; C_BOLD=$'\e[1m'; C_RESET=$'\e[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_BOLD=""; C_RESET=""
fi

log()  { printf '%s\n' "$*"; }
info() { printf '%s%s%s\n' "$C_BLUE" "$*" "$C_RESET"; }
ok()   { printf '%s%s%s\n' "$C_GREEN" "$*" "$C_RESET"; }
warn() { printf '%s%s%s\n' "$C_YELLOW" "$*" "$C_RESET"; }
err()  { printf '%s%s%s\n' "$C_RED" "$*" "$C_RESET" >&2; }

# ---- helpers ----------------------------------------------------------------
run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    printf '%s[dry-run]%s %s\n' "$C_YELLOW" "$C_RESET" "$*"
  else
    bash -c "$*"
  fi
}

# Garante que nada sob $KEEP_PATH seja deletado, mesmo por engano.
safe_rm() {
  local target="$1"
  [[ -e "$target" || -L "$target" ]] || return 0
  local resolved
  resolved="$(realpath -m "$target")"
  if [[ "$resolved" == "$KEEP_PATH" || "$resolved" == "$KEEP_PATH"/* ]]; then
    err "  RECUSADO: alvo dentro do --keep ($target)"
    return 1
  fi
  if run "rm -rf -- '$target'"; then
    if [[ $DRY_RUN -eq 1 ]]; then
      log "  (seria removido) $target"
    else
      ok "  removido: $target"
    fi
  fi
}

backup_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  run "cp -- '$file' '${file}.bak-${stamp}'"
  log "  backup: ${file}.bak-${stamp}"
}

# ---- cabecalho --------------------------------------------------------------
log
info "${C_BOLD}== Limpeza do plugin: ${PLUGIN_NAME} (marketplace: ${MARKETPLACE_NAME}) =="
log "Preservando : $KEEP_PATH"
[[ $DRY_RUN -eq 1 ]] && warn "Modo dry-run: nada sera escrito ou deletado."

if [[ $DRY_RUN -eq 0 && $ASSUME_YES -eq 0 ]]; then
  printf "Continuar? Digite 'sim' para confirmar: "
  read -r reply
  if [[ "$reply" != "sim" ]]; then
    warn "Abortado pelo usuario."
    exit 0
  fi
fi

# ---- 1) CLI oficial (best effort) -------------------------------------------
INSTALLED_JSON="$HOME/.claude/plugins/installed_plugins.json"
KNOWN_JSON="$HOME/.claude/plugins/known_marketplaces.json"
CODEX_TOML="$HOME/.codex/config.toml"

if command -v claude >/dev/null 2>&1; then
  info "1) Tentando 'claude plugin uninstall' / 'marketplace remove' ..."
  if [[ -f "$INSTALLED_JSON" ]]; then
    mapfile -t project_paths < <(
      jq -r --arg key "${PLUGIN_NAME}@${MARKETPLACE_NAME}" \
        '.plugins[$key][]?.projectPath // empty' "$INSTALLED_JSON"
    )
    for pp in "${project_paths[@]}"; do
      [[ -z "$pp" ]] && continue
      if [[ -d "$pp" ]]; then
        log "   uninstall em: $pp"
        run "(cd '$pp' && claude plugin uninstall '${PLUGIN_NAME}@${MARKETPLACE_NAME}' --scope local -y) >/dev/null 2>&1 || true"
      else
        warn "   projectPath inexistente, ignorando: $pp"
      fi
    done
  fi
  run "claude plugin marketplace remove '${MARKETPLACE_NAME}' >/dev/null 2>&1 || true"
  ok "  CLI executada (best-effort)"
else
  warn "1) 'claude' CLI nao encontrada — pulando comandos oficiais"
fi

# ---- 2) Registros do Claude --------------------------------------------------
if [[ -f "$INSTALLED_JSON" ]]; then
  info "2) Limpando registro em $INSTALLED_JSON ..."
  if jq -e --arg key "${PLUGIN_NAME}@${MARKETPLACE_NAME}" \
       '.plugins[$key]' "$INSTALLED_JSON" >/dev/null 2>&1; then
    backup_file "$INSTALLED_JSON"
    if [[ $DRY_RUN -eq 0 ]]; then
      tmp="$(mktemp)"
      jq --arg key "${PLUGIN_NAME}@${MARKETPLACE_NAME}" \
         'del(.plugins[$key])' "$INSTALLED_JSON" > "$tmp"
      mv "$tmp" "$INSTALLED_JSON"
    fi
    ok "  entrada removida"
  else
    log "  (nada a remover)"
  fi
fi

if [[ -f "$KNOWN_JSON" ]]; then
  info "3) Limpando registro em $KNOWN_JSON ..."
  if jq -e --arg key "${MARKETPLACE_NAME}" '.[$key]' "$KNOWN_JSON" >/dev/null 2>&1; then
    backup_file "$KNOWN_JSON"
    if [[ $DRY_RUN -eq 0 ]]; then
      tmp="$(mktemp)"
      jq --arg key "${MARKETPLACE_NAME}" 'del(.[$key])' "$KNOWN_JSON" > "$tmp"
      mv "$tmp" "$KNOWN_JSON"
    fi
    ok "  entrada removida"
  else
    log "  (nada a remover)"
  fi
fi

# ---- 3) Registro do Codex ----------------------------------------------------
if [[ -f "$CODEX_TOML" ]]; then
  info "4) Limpando [marketplaces.${MARKETPLACE_NAME}] em $CODEX_TOML ..."
  if grep -q "^\[marketplaces\.${MARKETPLACE_NAME}\]" "$CODEX_TOML"; then
    backup_file "$CODEX_TOML"
    if [[ $DRY_RUN -eq 0 ]]; then
      tmp="$(mktemp)"
      awk -v target="[marketplaces.${MARKETPLACE_NAME}]" '
        /^\[/ { skip = ($0 == target) ? 1 : 0 }
        !skip { print }
      ' "$CODEX_TOML" > "$tmp"
      mv "$tmp" "$CODEX_TOML"
    fi
    ok "  secao removida"
  else
    log "  (nada a remover)"
  fi
fi

# ---- 4) Diretorios fisicos do plugin ----------------------------------------
info "5) Removendo diretorios de cache/marketplace do plugin ..."
declare -a TARGETS=(
  "$HOME/.claude/plugins/cache/${MARKETPLACE_NAME}"
  "$HOME/.claude/plugins/marketplaces/${MARKETPLACE_NAME}"
  "$HOME/.codex/.tmp/marketplaces/${MARKETPLACE_NAME}"
)
for t in "${TARGETS[@]}"; do
  safe_rm "$t"
done

# ---- 5) Clones soltos em ~/projetos -----------------------------------------
info "6) Procurando clones em ~/projetos (exceto --keep) ..."
if [[ -d "$HOME/projetos" ]]; then
  while IFS= read -r -d '' meta; do
    plugin_root="$(dirname "$(dirname "$meta")")"
    resolved="$(realpath -m "$plugin_root")"
    if jq -e --arg name "$PLUGIN_NAME" '.name == $name' "$meta" >/dev/null 2>&1; then
      if [[ "$resolved" == "$KEEP_PATH" || "$resolved" == "$KEEP_PATH"/* ]]; then
        log "  preservado: $plugin_root"
        continue
      fi
      safe_rm "$plugin_root"
    fi
  done < <(find "$HOME/projetos" -maxdepth 6 -type f -name plugin.json \
            -path '*.claude-plugin*' -print0 2>/dev/null)
fi

# ---- 6) Submodulos orfaos ---------------------------------------------------
info "7) Removendo caches de submodulo git relacionados ao plugin ..."
if [[ -d "$HOME/projetos" ]]; then
  while IFS= read -r -d '' submod; do
    case "$(basename "$submod")" in
      tray-api-claude-plugin|tray-plugins) safe_rm "$submod" ;;
    esac
  done < <(find "$HOME/projetos" -maxdepth 6 -type d \
            \( -name 'tray-api-claude-plugin' -o -name 'tray-plugins' \) \
            -path '*/.git/modules/*' -print0 2>/dev/null)
fi

# ---- 7) Lixeira do GNOME ----------------------------------------------------
TRASH_FILES="$HOME/.local/share/Trash/files"
TRASH_INFO="$HOME/.local/share/Trash/info"
if [[ -d "$TRASH_FILES" ]]; then
  info "8) Limpando lixeira (itens com 'tray-plugin' ou 'tray-api' no nome) ..."
  shopt -s nullglob dotglob
  for item in "$TRASH_FILES"/*; do
    name="$(basename "$item")"
    case "$name" in
      *tray-plugin*|*tray-api*)
        safe_rm "$item"
        safe_rm "$TRASH_INFO/${name}.trashinfo"
        ;;
    esac
  done
  shopt -u nullglob dotglob
fi

# ---- 8) Verificacao final ---------------------------------------------------
info "${C_BOLD}== Verificacao final =="
remaining=()

for d in \
  "$HOME/.claude/plugins/cache/${MARKETPLACE_NAME}" \
  "$HOME/.claude/plugins/marketplaces/${MARKETPLACE_NAME}" \
  "$HOME/.codex/.tmp/marketplaces/${MARKETPLACE_NAME}"; do
  [[ -e "$d" ]] && remaining+=("$d")
done

if [[ -f "$INSTALLED_JSON" ]] && \
   jq -e --arg key "${PLUGIN_NAME}@${MARKETPLACE_NAME}" \
        '.plugins[$key]' "$INSTALLED_JSON" >/dev/null 2>&1; then
  remaining+=("registro: $INSTALLED_JSON")
fi
if [[ -f "$KNOWN_JSON" ]] && \
   jq -e --arg key "${MARKETPLACE_NAME}" '.[$key]' "$KNOWN_JSON" >/dev/null 2>&1; then
  remaining+=("registro: $KNOWN_JSON")
fi
if [[ -f "$CODEX_TOML" ]] && \
   grep -q "^\[marketplaces\.${MARKETPLACE_NAME}\]" "$CODEX_TOML"; then
  remaining+=("registro: $CODEX_TOML")
fi

if [[ ${#remaining[@]} -eq 0 ]]; then
  ok "Tudo limpo. Repositorio preservado: $KEEP_PATH"
  exit 0
fi

warn "Itens ainda presentes (verifique manualmente):"
for r in "${remaining[@]}"; do
  log "  - $r"
done
exit 1
