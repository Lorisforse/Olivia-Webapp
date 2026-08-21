"""
Crea (o aggiorna) un account di accesso alla dashboard web.

Gli account dello studio vivono nella collection "webapp-users", separata dalla
collection "users" del bot Telegram, che contiene i pazienti e non va toccata.

Uso:
    cd olivia-backend
    python create_user.py --email medico@olivia.it --name "Dr.ssa Elena Russo" --password "SceltaTua123"

Se si omette --password viene chiesta a schermo (non finisce nella cronologia
della shell). Con --force si aggiorna un account già esistente.

Richiede solo pymongo e un MongoDB raggiungibile: l'URL viene letto da
--mongodb-url, dalla variabile d'ambiente MONGODB_URL o dal file .env.
"""

import argparse
import getpass
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient

from src.security import hash_password

DEFAULT_MONGODB_URL = 'mongodb://olivia:olivia@localhost:27017/olivia?authSource=admin'
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def read_env_file(path: Path) -> dict[str, str]:
    """Parser minimale del .env: serve a non dipendere da python-dotenv."""
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def resolve_mongodb_url(cli_value: str | None) -> tuple[str, str]:
    env_file = read_env_file(Path(__file__).parent / '.env')
    url = cli_value or os.getenv('MONGODB_URL') or env_file.get('MONGODB_URL') or DEFAULT_MONGODB_URL
    db_name = os.getenv('MONGODB_DB') or env_file.get('MONGODB_DB') or 'olivia'
    return url, db_name


def mask(url: str) -> str:
    return re.sub(r'://([^:/@]+):[^@]*@', r'://\1:***@', url)


def main() -> int:
    parser = argparse.ArgumentParser(description='Crea un account per la dashboard Olivia.')
    parser.add_argument('--email', required=True, help='Email di accesso')
    parser.add_argument('--name', required=True, help='Nome mostrato in dashboard, es. "Dr.ssa Elena Russo"')
    parser.add_argument('--password', help='Password in chiaro (se omessa viene chiesta a schermo)')
    parser.add_argument('--role', default='Nutrizionista', help='Ruolo mostrato nel menu utente')
    parser.add_argument('--mongodb-url', dest='mongodb_url', help='Override della connessione MongoDB')
    parser.add_argument('--force', action='store_true', help="Aggiorna l'account se l'email esiste già")
    args = parser.parse_args()

    email = args.email.strip().lower()
    if not EMAIL_RE.match(email):
        print(f'Email non valida: {email}', file=sys.stderr)
        return 1

    password = args.password or getpass.getpass('Password: ')
    if len(password) < 8:
        print('La password deve essere lunga almeno 8 caratteri.', file=sys.stderr)
        return 1

    url, db_name = resolve_mongodb_url(args.mongodb_url)
    print(f'Connessione a {mask(url)} (database "{db_name}")')

    client = MongoClient(url, serverSelectionTimeoutMS=5000)
    users = client[db_name]['webapp-users']
    client.admin.command('ping')
    users.create_index('email', unique=True)

    existing = users.find_one({'email': email})
    if existing and not args.force:
        print(f"Esiste già un account con email {email}. Usa --force per aggiornarlo.", file=sys.stderr)
        return 1

    fields = {
        'email': email,
        'name': args.name.strip(),
        'role': args.role.strip(),
        'password_hash': hash_password(password),
        'is_active': True,
    }

    if existing:
        users.update_one({'_id': existing['_id']}, {'$set': fields})
        print(f'Account aggiornato: {email} (id {existing["_id"]})')
    else:
        fields['created_at'] = datetime.now(timezone.utc)
        fields['last_login_at'] = None
        result = users.insert_one(fields)
        print(f'Account creato: {email} (id {result.inserted_id})')

    client.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
