import { supabase } from '../config/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, importance, limit = 50 } = req.query;

    let query = supabase
      .from('memories')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (category) query = query.eq('category', category);
    if (importance) query = query.eq('importance_level', importance);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    res.status(200).json({ success: true, memories: data || [] });
  } catch (error) {
    console.error('Error listing memories:', error);
    res.status(500).json({ error: error.message });
  }
}
