from supabase import Client, create_client

from core.config import SUPABASE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL


supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Bypasses row level security. Only used by administrator actions.
admin_supabase: Client | None = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_SERVICE_KEY else None
)
