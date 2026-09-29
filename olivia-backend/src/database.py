from motor.motor_asyncio import AsyncIOMotorClient

from src.settings import settings

# Le variabili d'ambiente vincono sul .env letto da Settings (vedi src/settings.py).
MONGODB_URL = settings.mongodb_url
MONGODB_DB = settings.mongodb_db

client = AsyncIOMotorClient(MONGODB_URL)
db = client[MONGODB_DB]


def get_database():
    return db


# Account di accesso alla dashboard (medici/nutrizionisti): collection separata da
# "users", che invece appartiene ai pazienti del bot e non va toccata.
def get_webapp_users_col(database): return database["webapp-users"]
# Appuntamenti dell'agenda. Collection solo-webapp letta anche dal bot con il
# modulo appuntamenti, che invia il promemoria e aggiorna `status` alla risposta.
def get_appointments_col(database): return database["webapp-appointments"]
# Voci disponibili nella tendina "Obiettivo" in creazione/modifica paziente.
# Collection solo-webapp: parte vuota, la nutrizionista la popola aggiungendo
# voci al volo (vedi src/routers/goal_options.py).
def get_goal_options_col(database): return database["webapp-goal-options"]
# Coda di notifiche "dieta cambiata": scritta qui quando si assegna una nuova
# dieta a un paziente già connesso che ne aveva già una diversa, letta dal bot
# modificato (olivia-chatbot-calendario) che invia il messaggio e segna
# sent_at. Con il bot originale in esecuzione nessuno la legge: resta lì
# innocua, stesso principio già usato per "webapp-appointments".
def get_diet_notifications_col(database): return database["webapp-diet-notifications"]
