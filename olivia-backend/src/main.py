from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.auth import get_current_user
from src.routers import auth, diets, logs, patients, reports

app = FastAPI(title='Olivia API', version='0.3.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Tutti i dati clinici stanno dietro al login: senza Bearer token si riceve 401.
protected = [Depends(get_current_user)]

app.include_router(auth.router, prefix='/auth', tags=['auth'])
app.include_router(patients.router, prefix='/patients', tags=['patients'], dependencies=protected)
app.include_router(diets.router, prefix='/diets', tags=['diets'], dependencies=protected)
app.include_router(logs.router, prefix='/patients', tags=['logs'], dependencies=protected)
app.include_router(reports.router, prefix='/patients', tags=['reports'], dependencies=protected)


@app.get('/')
def healthcheck():
    return {'status': 'ok', 'service': 'olivia-api'}
