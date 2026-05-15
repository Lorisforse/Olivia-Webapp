from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import diets, logs, patients, reports

app = FastAPI(title='Olivia API', version='0.2.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(patients.router, prefix='/patients', tags=['patients'])
app.include_router(diets.router, prefix='/diets', tags=['diets'])
app.include_router(logs.router, prefix='/patients', tags=['logs'])
app.include_router(reports.router, prefix='/patients', tags=['reports'])


@app.get('/')
def healthcheck():
    return {'status': 'ok', 'service': 'olivia-api'}
