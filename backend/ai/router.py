from fastapi import APIRouter, Depends, HTTPException, Request

from ai import service
from ai.schemas import ChatRequest
from core.auth import get_authenticated_user, get_optional_user


router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat")
def chat(data: ChatRequest, request: Request, user=Depends(get_optional_user)):
    key = str(user.id) if user else request.client.host
    if not service.check_rate_limit("chat", key):
        raise HTTPException(
            status_code=429,
            detail="You're sending messages too quickly. Please wait a minute and try again.",
        )
    return service.chat(data.message, [message.model_dump() for message in data.history])


@router.get("/recommendations")
def recommendations(refresh: bool = False, user=Depends(get_authenticated_user)):
    try:
        return service.recommendations(str(user.id), refresh)
    except service.RateLimitError as error:
        raise HTTPException(status_code=429, detail=str(error)) from error
    except Exception as error:
        service.logger.exception("AI recommendations request failed")
        raise HTTPException(
            status_code=503,
            detail="Recommendations aren't available right now. Please try again later.",
        ) from error
