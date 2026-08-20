# Setup CI/CD Jenkins per Olivia (backend + frontend) sul VPS

Checklist da seguire sul VPS. Il codice (`docker-compose.prod.yml`, `Jenkinsfile`,
`olivia-frontend/Dockerfile.prod`) è già pronto nel repo `Olivia-Webapp-Codice`;
qui sotto solo i passi lato server.

## 0. Prerequisiti da verificare

- [x] ~~Esiste già la rete Docker `olivia-network`~~ — sul VPS esisteva solo
      `olivia-network-olivia` (nome sbagliato) e senza nessun container collegato.
      Corretta con:
      ```bash
      docker network rm olivia-network-olivia
      docker network create olivia-network
      ```
- [x] ~~Verificare nome del container Mongo in produzione~~ — **non esiste ancora
      nessun Mongo sul VPS** (né il bot: ha sempre girato sul server universitario,
      mai su questa macchina). Va creato da zero, vedi punto 1.
- [ ] `docker compose version` funziona **dentro il container Jenkins** (se Jenkins
      gira in Docker serve il socket dell'host montato: `-v /var/run/docker.sock:/var/run/docker.sock`
      e il pacchetto `docker-ce-cli` + plugin compose installati nell'immagine Jenkins).

## 1. MongoDB (prima volta, dati puliti) — ✅ fatto

Loris ha deciso di ripartire da un database vuoto sul VPS (non migrare il dump
universitario nei dati di produzione — quello resta solo per analisi separata).
`/opt/olivia/` conteneva un tentativo precedente (compose con la rete
`olivia-network-olivia` sbagliata, mai davvero popolato di dati reali) — rimosso
insieme al suo volume, poi ripartito pulito con il repo vero:

```bash
cd /opt/olivia && docker compose down -v   # via il tentativo precedente + suo volume
cd / && rm -rf /opt/olivia/*
git clone https://github.com/Lorisforse/Olivia-Webapp.git /opt/olivia
cd /opt/olivia
docker compose -f deploy/docker-compose.mongo.yml up -d
```

Mongo è su, sulla rete `olivia-network` corretta. Non fa parte della pipeline
Jenkins di proposito: un database è stato persistente, non va ricostruito ad
ogni deploy del codice come backend/frontend.

## 2. File di ambiente (segreti, mai nel repo)

```bash
nano /opt/olivia/.env.prod
```

Copiare il contenuto di `Olivia-Webapp-Codice/.env.prod.example` compilando i
valori reali (URL Mongo di produzione, dominio scelto per `VITE_API_URL`).

## 3. Job Jenkins

1. New Item → Pipeline (o Multibranch Pipeline se preferisci build automatiche
   anche su branch diversi da `main`).
2. Pipeline script from SCM → Git → `https://github.com/Lorisforse/Olivia-Webapp`,
   branch `*/main`, script path `Jenkinsfile` (è nella root del repo).
   Repo pubblico → nessuna credenziale Git necessaria.

## 4. Trigger automatico su push

Il `Jenkinsfile` usa `triggers { githubPush() }`, quindi serve un webhook:

1. Su GitHub → repo `Olivia-Webapp` → Settings → Webhooks → Add webhook
   - Payload URL: `http://<host-jenkins>:<porta>/github-webhook/`
   - Content type: `application/json`
   - Evento: solo `push`
2. Nel job Jenkins → Configure → spuntare **"GitHub hook trigger for GITScm polling"**.

Se Jenkins non è raggiungibile pubblicamente da GitHub, alternativa: polling
SCM (`pollSCM('H/5 * * * *')`) invece del webhook.

## 5. Reverse proxy + dominio

1. Puntare due (sotto)domini al VPS (record DNS A), es.
   `api.olivia.lorisamato.it` e `app.olivia.lorisamato.it`.
2. Adattare `deploy/nginx-olivia.example.conf` (sostituire il dominio) e
   installarlo nella config nginx già in uso sul server, poi `nginx -t && systemctl reload nginx`.
3. `certbot --nginx -d api.olivia.lorisamato.it -d app.olivia.lorisamato.it` per l'HTTPS.

## 6. Primo run

1. Lanciare la build manualmente da Jenkins ("Build Now") per validare che
   tutto funzioni prima di fidarsi del trigger automatico.
2. Verificare:
   - `curl https://api.olivia.lorisamato.it/` → `{"status":"ok","service":"olivia-api"}`
   - `https://app.olivia.lorisamato.it` nel browser → dashboard (non demo mode,
     dato che il backend reale è raggiungibile).
3. Fare un push di prova su `main` e controllare che Jenkins parta da solo.

## ⚠️ Da non dimenticare prima di condividere l'URL con chiunque

Il backend oggi non ha **nessuna autenticazione** e CORS è aperto a tutti
(`allow_origins=['*']`). Va bene in locale/dev, ma un'istanza raggiungibile
pubblicamente su un dominio reale espone dati pazienti senza protezione.
Da mettere come task prioritario subito dopo il deploy, prima di usarla con
dati reali (anche solo un basic auth su nginx come tampone temporaneo).
