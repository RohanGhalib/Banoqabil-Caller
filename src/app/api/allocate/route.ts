import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, serviceKey);
};

export async function POST(request: Request) {
  try {
    const { callerId, count } = await request.json();

    if (!callerId || !count) {
      return NextResponse.json(
        { error: 'Caller ID and allocation count are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch unassigned members (first N rows)
    const { data: unassigned, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('id')
      .is('assigned_to', null)
      .order('id', { ascending: true })
      .limit(count);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    if (!unassigned || unassigned.length === 0) {
      return NextResponse.json({ success: true, allocatedCount: 0 });
    }

    const idsToUpdate = unassigned.map(m => m.id);

    // 2. Bulk update assigned status
    const { error: updateError } = await supabaseAdmin
      .from('members')
      .update({
        assigned_to: callerId,
        assigned_at: new Date().toISOString()
      })
      .in('id', idsToUpdate);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      allocatedCount: idsToUpdate.length
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
