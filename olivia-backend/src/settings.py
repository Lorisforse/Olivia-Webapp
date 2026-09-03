from pydantic_settings import BaseSettings, SettingsConfigDict

# Segreto di sviluppo: va sovrascritto con JWT_SECRET nel .env prima di
# esporre l'API. src/auth.py logga un warning se resta questo.
DEV_JWT_SECRET = 'dev-secret-cambiami'


class Settings(BaseSettings):
    app_name: str = 'Olivia API'
    mongodb_url: str = 'mongodb://localhost:27017'
    mongodb_db: str = 'olivia'
    debug: bool = True

    # Autenticazione della dashboard (vedi src/auth.py)
    jwt_secret: str = DEV_JWT_SECRET
    jwt_expire_minutes: int = 720   # sessione normale: 12 ore
    jwt_remember_days: int = 30     # login con "resta connesso"

    # Username del bot Telegram (senza @), per il deep link di onboarding
    # https://t.me/<bot_username>?start=<patient_id>. Override con BOT_USERNAME
    # nel .env; cambiarlo richiede solo un riavvio del container, non un rebuild.
    bot_username: str = 'olivia_loris_bot'

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


settings = Settings()
