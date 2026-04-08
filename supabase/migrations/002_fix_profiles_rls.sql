-- Fix infinite recursion in profiles RLS policies.
-- The problem: policies on `profiles` that do subqueries on `profiles`
-- cause PostgreSQL to recurse infinitely.
-- The fix: a SECURITY DEFINER function that bypasses RLS to read the caller's role.

-- Step 1: Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

-- Step 2: Create a stable, security-definer function to get the current user's role.
-- SECURITY DEFINER means it runs as the function owner (postgres), bypassing RLS.
-- This breaks the recursion.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Step 3: Recreate policies using the function (no more self-referencing subqueries)

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (get_my_role() = 'regional_admin');

CREATE POLICY "Admins can manage profiles"
ON profiles FOR ALL
USING (get_my_role() = 'regional_admin');
