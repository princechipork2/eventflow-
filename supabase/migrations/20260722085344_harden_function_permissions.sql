-- Revoke EXECUTE from PUBLIC (anon) for all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.buy_tickets FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable FROM PUBLIC;

-- Keep EXECUTE for authenticated users on buy_tickets (they need it to buy tickets)
GRANT EXECUTE ON FUNCTION public.buy_tickets TO authenticated;

-- handle_new_user is a trigger function called by the auth layer, not via RPC
-- Anon should NOT be able to call it directly
-- Authenticated users shouldn't need to call it manually either
-- It's called automatically by the trigger on auth.users insert

-- rls_auto_enable is a migration/utility function, not for direct user calls
-- It shouldn't be exposed via RPC at all
