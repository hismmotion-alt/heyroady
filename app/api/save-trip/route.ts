import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start, end, trip_data } = await req.json();

    if (!start || !end || !trip_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_trips')
      .insert({ user_id: user.id, start, end: end, trip_data })
      .select('id')
      .single();

    if (error) {
      console.error('Save trip error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Save trip error:', error);
    return Response.json({ error: 'Failed to save trip' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return Response.json({ error: 'Missing trip id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('saved_trips')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Unsave trip error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Unsave trip error:', error);
    return Response.json({ error: 'Failed to unsave trip' }, { status: 500 });
  }
}
