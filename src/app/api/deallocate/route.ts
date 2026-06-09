import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, serviceKey);
};

export async function POST(request: Request) {
  try {
    const { callerId, amount } = await request.json();

    if (!callerId) {
      return NextResponse.json(
        { error: 'Caller ID is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Base query: get only 'not_called' leads assigned to this caller
    let query = supabaseAdmin
      .from('members')
      .select('id')
      .eq('assigned_to', callerId)
      .eq('call_status', 'not_called')
      .order('id', { ascending: false }); // Unassign the newest ones first

    // If a specific number is requested, limit the query
    if (amount !== 'all' && typeof amount === 'number' && amount > 0) {
      query = query.limit(amount);
    }

    const { data: leads, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ success: true, deallocatedCount: 0 });
    }

    const idsToUpdate = leads.map(m => m.id);

    // Unassign the selected leads
    const { error: updateError } = await supabaseAdmin
      .from('members')
      .update({
        assigned_to: null,
        assigned_at: null
      })
      .in('id', idsToUpdate);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      deallocatedCount: idsToUpdate.length
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
