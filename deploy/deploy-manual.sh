#!/usr/bin/env bash
#
# Deploy manuale di emergenza della webapp Olivia (backend + frontend).
#
# NON e' il modo normale di rilasciare: di solito si fa tutto da Jenkins
# (push su main -> deploy automatico in ~2 minuti). Questo script serve SOLO
# quando Jenkins e' rotto o irraggiungibile e il sito va rimesso su a mano.
#
# Fa le stesse identiche cose del Jenkinsfile, nello stesso ordine e con lo
# stesso project name (-p olivia), cosi' i due metodi non si pestano i piedi.
#
# Prerequisito una tantum: il file $REPO_DIR/.env.prod con
#   MONGODB_URL, MONGODB_DB, JWT_SECRET, VITE_API_URL
# Il repo viene clonato da solo se $REPO_DIR non esiste ancora.
#
# Uso (da una copia gia' presente):
#   bash /opt/olivia/deploy/deploy-manual.sh
# oppure senza nessuna copia, scaricando solo lo script:
#   curl -sO https://raw.githubusercontent.com/Lorisforse/Olivia-Webapp/main/deploy/deploy-manual.sh
#   bash deploy-manual.sh
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Lorisforse/Olivia-Webapp.git}"
REPO_DIR="${REPO_DIR:-/opt/olivia}"
ENV_FILE="$REPO_DIR/.env.prod"
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
COMPOSE="docker compose -p olivia --env-file $ENV_FILE -f $COMPOSE_FILE"

echo "==> [1/4] Codice in $REPO_DIR"
if [ -d "$REPO_DIR/.git" ]; then
    git -C "$REPO_DIR" pull --ff-only
else
    echo "    $REPO_DIR non e' un checkout: clono da $REPO_URL"
    git clone "$REPO_URL" "$REPO_DIR"
fi

[ -f "$ENV_FILE" ] || { echo "ERRORE: manca $ENV_FILE (crealo con MONGODB_URL, MONGODB_DB, JWT_SECRET, VITE_API_URL)"; exit 1; }

cd "$REPO_DIR"

echo "==> [2/4] Demolisco i container esistenti"
# `docker compose up` non rimuove un container con lo stesso container_name
# creato da un'altra invocazione: va tolto a mano prima.
$COMPOSE down --remove-orphans || true
docker rm -f olivia-backend olivia-frontend 2>/dev/null || true

echo "==> [3/4] Build + up"
$COMPOSE up -d --build --remove-orphans

echo "==> [4/4] Stato"
docker ps --filter name=olivia --format 'table {{.Names}}\t{{.Status}}'
echo
echo "--- ultimi log backend ---"
docker logs --tail 20 olivia-backend
