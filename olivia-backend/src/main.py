import asyncio
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.auth import get_current_user
from src.pending_diet import pending_diet_suspension_loop
from src.routers import appointments, auth, diets, goal_options, logs, patients, reports
from src.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(pending_diet_suspension_loop())
    yield
    task.cancel()


# In produzione (DEBUG=false) /docs, /redoc e lo schema OpenAPI restano
# disattivati: non serve esporre la mappa dell'API in chiaro.
app = FastAPI(
    title='Olivia API',
    version='0.3.0',
    docs_url='/docs' if settings.debug else None,
    redoc_url='/redoc' if settings.debug else None,
    openapi_url='/openapi.json' if settings.debug else None,
    lifespan=lifespan,
)

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
app.include_router(appointments.router, prefix='/appointments', tags=['appointments'], dependencies=protected)
app.include_router(goal_options.router, prefix='/goal-options', tags=['goal-options'], dependencies=protected)


@app.get('/')
def healthcheck():
    return {'status': 'ok', 'service': 'olivia-api'}
