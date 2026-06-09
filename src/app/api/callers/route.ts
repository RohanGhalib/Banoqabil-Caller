import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side supabase client with Service Role Key to bypass RLS/Admin restrictions
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Create user in Supabase Auth using admin panel permissions
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Note: The public.callers row is automatically created by the on_auth_user_created trigger in schema.sql
    return NextResponse.json({ 
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email,
        name
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
