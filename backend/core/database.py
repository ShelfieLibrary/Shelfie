import httpx
from supabase import Client, ClientOptions, create_client

from core.config import SUPABASE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL


# HTTP/1.1 instead of supabase-py's default HTTP/2: concurrent requests sharing one
# HTTP/2 connection fail on Windows with "WinError 10035".
def _client(key: str) -> Client:
    return create_client(SUPABASE_URL, key, ClientOptions(httpx_client=httpx.Client(http2=False)))


supabase: Client = _client(SUPABASE_KEY)

# Bypasses row level security. Only used by administrator actions.
admin_supabase: Client | None = _client(SUPABASE_SERVICE_KEY) if SUPABASE_SERVICE_KEY else None
