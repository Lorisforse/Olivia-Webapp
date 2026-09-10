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
# Prerequisiti sul VPS (una tantum):
#   git clone https://github.com/Lorisforse/Olivia-Webapp.git /opt/olivia
#   # + creare /opt/olivia/.env.prod con MONGODB_URL, MONGODB_DB, JWT_SECRET, VITE_API_URL
#
# Uso:
#   bash /opt/olivia/deploy/deploy-manual.sh
#
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/olivia}"
ENV_FILE="$REPO_DIR/.env.prod"
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
COMPOSE="docker compose -p olivia --env-file $ENV_FILE -f $COMPOSE_FILE"

[ -f "$ENV_FILE" ]     || { echo "ERRORE: manca $ENV_FILE"; exit 1; }
[ -f "$COMPOSE_FILE" ] || { echo "ERRORE: manca $COMPOSE_FILE (repo clonato in $REPO_DIR?)"; exit 1; }

cd "$REPO_DIR"

echo "==> [1/4] Aggiorno il codice"
git pull --ff-only

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
