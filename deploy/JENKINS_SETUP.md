# Setup CI/CD Jenkins per Olivia (backend + frontend) sul VPS

Storico di come backend+frontend sono stati portati online su `lorisamato.it`.
Tutti i passi sono ✅ completati e verificati — questo documento serve come
riferimento per rifare/capire il setup, non più come checklist da eseguire.

## 0. Prerequisiti verificati

- Rete Docker: esisteva solo `olivia-network-olivia` (nome sbagliato, nessun
  container collegato) — ricreata come `olivia-network`.
- Nessun Mongo/bot preesistevano sul VPS (il bot ha sempre girato sul server
  universitario). Mongo creato da zero, vedi `docker-compose.mongo.yml`.
- Jenkins gira **containerizzato** con accesso al docker socket dell'host
  (docker-outside-of-docker) — confermato funzionante, nessuna azione servita.

## 1. MongoDB

```bash
docker compose -f deploy/docker-compose.mongo.yml up -d
```

Non fa parte della pipeline Jenkins di proposito: un database è stato
persistente, non va ricostruito ad ogni deploy del codice come backend/frontend.

## 2. Segreti backend/frontend — credenziale Jenkins, non file su host

Jenkins gira nel suo container e non vede il filesystem del VPS host — un file
tipo `/opt/olivia/.env.prod` per lui non esiste. Il segreto è caricato come
**credenziale Jenkins** (stesso pattern del job `budget-bot`):

- Manage Jenkins → Credentials → System → Global credentials → Add Credentials
- Kind: **Secret file**, ID: **`olivia-env-prod`** (deve combaciare con
  `withCredentials([file(credentialsId: 'olivia-env-prod', ...)])` nel Jenkinsfile)
- Contenuto (vedi `.env.prod.example` per il template):
  `MONGODB_URL`, `MONGODB_DB`, `VITE_API_URL`

## 3. Job Jenkins

Pipeline → Pipeline script from SCM → Git →
`https://github.com/Lorisforse/Olivia-Webapp.git`, branch `*/main`,
script path `Jenkinsfile`. Repo pubblico, nessuna credenziale Git necessaria.

## 4. Trigger automatico su push

Niente webhook: Jenkins sta dietro il firewall IONOS (solo IP di casa ammesso),
i server di GitHub non riuscirebbero mai a chiamarlo. Il `Jenkinsfile` usa
`triggers { pollSCM('H/2 * * * *') }` — è Jenkins stesso a controllare GitHub
ogni ~2 minuti (stesso pattern del job `budget-bot`).

## 5. Healthcheck: niente curl verso 127.0.0.1

Stesso problema del trigger: da dentro il container Jenkins, `127.0.0.1` è il
container di Jenkins, non l'host. Lo stage Healthcheck nel `Jenkinsfile` usa
`docker inspect` sullo stato del container (via socket, non rete) invece di
`curl` verso un indirizzo di rete.

## 6. Reverse proxy + HTTPS

nginx gira **containerizzato** (container `nginx`, condiviso con
nefta.it/SAM/csv-analyzer/...), config reale in `/opt/nginx/conf.d/`
(montata da host). Passi effettivamente eseguiti:

1. **DNS**: due record A su IONOS, `api.olivia.lorisamato.it` e
   `app.olivia.lorisamato.it` → IP pubblico del VPS.
2. **Aggancio alla rete**: `docker network connect olivia-network nginx`
   (a caldo, senza restart — non ha toccato gli altri siti). Verificato con
   `docker exec nginx getent hosts olivia-backend`.
3. **Vhost HTTP-only** creato in `/opt/nginx/conf.d/olivia.conf` (solo redirect
   + path ACME challenge) — serve prima dell'HTTPS per validare il certificato.
   `nginx -t && nginx -s reload` (mai `systemctl reload`, nginx è nel container).
4. **Certificati**: stesso meccanismo già in uso per `nefta.it` — `certbot`
   via `docker run --rm` puntato sugli stessi volumi già montati nel container
   nginx (`/opt/nefta/certbot/www`, `/opt/nefta/letsencrypt`). **Rinnovo
   automatico già coperto** dal cron esistente (`/usr/local/bin/nefta_cert_renew.sh`
   usa `certbot renew` generico, scansiona tutta la cartella — nessuna
   configurazione aggiuntiva necessaria per i nostri domini).
5. **Vhost HTTPS** aggiunto allo stesso file, proxy verso i container **per
   nome** (`olivia-backend:8000`, `olivia-frontend:80`), non verso
   `127.0.0.1:porta` — nginx containerizzato non vede le porte pubblicate
   sull'host. `resolver 127.0.0.11` **non** ridichiarato (già globale da
   `default.conf`, dichiararlo due volte fa fallire `nginx -t`). `proxy_pass`
   tramite variabile (`set $backend ...; proxy_pass $backend$request_uri;`)
   per forzare la ri-risoluzione ad ogni richiesta — necessario perché Jenkins
   ricrea i container ad ogni deploy con un IP interno diverso.

Config completa e commentata: `deploy/nginx-olivia.example.conf`.

## ⚠️ Da non dimenticare prima di condividere l'URL con chiunque

Il backend oggi non ha **nessuna autenticazione** e CORS è aperto a tutti
(`allow_origins=['*']`). Va bene in locale/dev, ma un'istanza raggiungibile
pubblicamente su un dominio reale espone dati pazienti senza protezione.
Priorità alta, prima di usarla con dati reali (anche solo un basic auth su
nginx come tampone temporaneo).
