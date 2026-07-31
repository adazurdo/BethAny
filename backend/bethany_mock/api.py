from __future__ import annotations

import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .account_repository import initialize_repository
from .bet_repository import initialize_repository as initialize_bet_repository
from .challenge_repository import initialize_repository as initialize_challenge_repository
from .mock_dataset_repository import initialize_repository as initialize_mock_dataset_repository
from .routers import account, auth, bets, challenges, mock_competitions, ranking_activity, social
from .social_repository import ConflictError, initialize_repository as initialize_social_repository


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_repository()
    initialize_mock_dataset_repository()
    initialize_social_repository()
    initialize_bet_repository()
    initialize_challenge_repository()
    yield


def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(ValueError)
    async def value_error_handler(request, exc: ValueError) -> JSONResponse:
        return JSONResponse({"error": str(exc)}, status_code=400)

    @app.exception_handler(ConflictError)
    async def conflict_error_handler(request, exc: ConflictError) -> JSONResponse:
        return JSONResponse({"error": str(exc)}, status_code=409)

    @app.exception_handler(LookupError)
    async def lookup_error_handler(request, exc: LookupError) -> JSONResponse:
        return JSONResponse({"error": str(exc)}, status_code=404)

    @app.exception_handler(PermissionError)
    async def permission_error_handler(request, exc: PermissionError) -> JSONResponse:
        return JSONResponse({"error": str(exc)}, status_code=403)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail
        if detail == "Not Found":
            detail = "not found"
        return JSONResponse({"error": detail}, status_code=exc.status_code)

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    app.include_router(auth.router)
    app.include_router(account.router)
    app.include_router(social.router)
    app.include_router(mock_competitions.router)
    app.include_router(bets.router)
    app.include_router(challenges.router)
    app.include_router(ranking_activity.router)

    return app


app = create_app()


def serve() -> None:
    host = os.getenv("BETHANY_API_HOST", "127.0.0.1")
    port = int(os.getenv("BETHANY_API_PORT", "8000"))
    print(f"BethAny API listening on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
