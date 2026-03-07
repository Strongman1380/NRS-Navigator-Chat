import { supabase } from '../config/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('memories')
      .select('category')
      .eq('is_active', true);

    if (error) throw new Error(error.message);

    const counts = {};
    (data || []).forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });

    res.status(200).json({ success: true, categories: counts });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: error.message });
  }
}
