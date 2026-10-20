from fastapi import HTTPException


def database_error(error: Exception, duplicate_message: str):
    message = str(error)
    if "duplicate" in message.lower() or "unique" in message.lower():
        raise HTTPException(status_code=409, detail=duplicate_message) from error
    raise HTTPException(status_code=500, detail=message) from error