/**
 * Import Knowledge Base Script
 *
 * Reads the Nebraska Resource Master JSON and imports it into the
 * Supabase `knowledge_base` table.
 *
 * Usage:
 *   node scripts/import-knowledge-base.js
 *
 * To rebuild the master JSON from source files first:
 *   node scripts/build-master-json.cjs && node scripts/import-knowledge-base.js
 *
 * Requires environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (not anon key, needs write access)
 *
 * You can set these in a .env file at the project root or export them.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load .env if present
try {
  const envFile = readFileSync(resolve(ROOT, '.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch { /* no .env file, that's fine */ }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  console.error('Set them in .env or export them before running this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  const masterPath = resolve(ROOT, 'Files/nebraska-resource-master.json');

  console.log('Reading Nebraska Resource Master JSON...\n');

  let masterData;
  try {
    const raw = readFileSync(masterPath, 'utf-8');
    masterData = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read master JSON at ${masterPath}`);
    console.error('Run "node scripts/build-master-json.cjs" first to generate it.');
    process.exit(1);
  }

  const { metadata, resources } = masterData;
  console.log(`  Version: ${metadata.version}`);
  console.log(`  Generated: ${metadata.generatedAt}`);
  console.log(`  Total resources: ${metadata.totalResources}\n`);
  console.log('  Categories:');
  for (const [cat, count] of Object.entries(metadata.categories)) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log('');

  // Map master JSON resources to knowledge_base table rows
  const rows = resources.map((r) => ({
    title: r.title,
    content: r.content,
    category: r.category,
    city: r.city || null,
    state: r.state || 'NE',
    zip_code: r.zip_code || null,
    phone: r.phone || null,
    website: r.website || null,
    tags: r.tags || [],
    lat: r.lat || null,
    lon: r.lon || null,
    source_file: r.source || 'master_json',
    is_active: true,
  }));

  // Clear all previously imported data (preserves manually-added entries without source_file)
  console.log('Clearing previous imports...');
  const { error: deleteError } = await supabase
    .from('knowledge_base')
    .delete()
    .not('source_file', 'is', null);

  if (deleteError) {
    console.error('Error clearing old data:', deleteError);
    // Continue anyway — table might be empty
  }

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('knowledge_base').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i}-${i + batch.length}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    process.stdout.write(`\rImporting... ${inserted + errors}/${rows.length}`);
  }

  console.log(`\n\nDone! Imported ${inserted} items. ${errors > 0 ? `${errors} errors.` : 'No errors.'}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
