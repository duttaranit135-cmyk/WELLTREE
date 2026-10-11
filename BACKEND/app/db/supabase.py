from supabase import create_client, Client
from app.config import settings


def get_supabase_client() -> Client:
    """Initialize base Supabase client (anon key)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def get_authenticated_supabase_client(access_token: str) -> Client:
    """Initialize Supabase client scoped with user JWT token for RLS."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    client.postgrest.auth(access_token)
    return client


def get_service_role_client() -> Client:
    """
    Initialize a Supabase client using the service-role key.
    IMPORTANT: Use only for server-side Storage operations (upload/delete/signed-URL).
    Authorization MUST be enforced in the calling API layer before invoking storage ops.
    This client MUST never be used for database queries to avoid bypassing RLS.
    """
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    return create_client(settings.SUPABASE_URL, key)
