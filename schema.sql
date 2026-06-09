-- =========================================================================
-- JAMAT-E-ISLAMI MULTAN CALL CENTER PORTAL - SUPABASE DATABASE SCHEMA
-- Copy and run this script in the Supabase SQL Editor.
-- =========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing objects if they exist (clean setup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin();
DROP TABLE IF EXISTS public.members;
DROP TABLE IF EXISTS public.callers;

-- 1. Create Callers (Profiles) Table
CREATE TABLE public.callers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'caller' CHECK (role IN ('admin', 'caller')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on callers
ALTER TABLE public.callers ENABLE ROW LEVEL SECURITY;

-- 2. Create Members Table
CREATE TABLE public.members (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    year_of_birth INTEGER,
    joining_date DATE,
    age INTEGER,
    call_status TEXT NOT NULL DEFAULT 'not_called' CHECK (call_status IN ('not_called', 'reached', 'not_picked', 'power_off', 'refused')),
    address TEXT,
    occupation TEXT,
    assigned_to UUID REFERENCES public.callers(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_by UUID REFERENCES public.callers(id) ON DELETE SET NULL
);

-- Enable RLS on members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_mobile ON public.members(mobile);
CREATE INDEX IF NOT EXISTS idx_members_assigned_to ON public.members(assigned_to);
CREATE INDEX IF NOT EXISTS idx_members_call_status ON public.members(call_status);

-- 3. Helper Functions for Policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.callers
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- 4. RLS Policies for Callers Table
CREATE POLICY "Allow public read access to callers" 
  ON public.callers FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow admins to do everything on callers" 
  ON public.callers FOR ALL 
  TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 5. RLS Policies for Members Table
CREATE POLICY "Admins have full access to members"
  ON public.members FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Callers can read assigned members"
  ON public.members FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Callers can update status, address, occupation on assigned members"
  ON public.members FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 6. Trigger: Auto-create caller profile when a user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.callers (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE 
      -- The first user to register becomes Admin automatically
      WHEN NOT EXISTS (SELECT 1 FROM public.callers) THEN 'admin'
      ELSE 'caller'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
