/**
 * Import Knowledge Base Script
 *
 * Reads the three resource files from Files/ and imports them into the
 * Supabase `knowledge_base` table.
 *
 * Usage:
 *   node scripts/import-knowledge-base.js
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

// ─── Parse knowledge.json ────────────────────────────────────────
function parseKnowledgeJson() {
  const raw = readFileSync(resolve(ROOT, 'Files/knowledg.json'), 'utf-8');
  const data = JSON.parse(raw);
  return data.items.map((item) => {
    // Extract city/state/zip/phone/website from the content text
    const cityMatch = item.content.match(/(?:,\s*)(\w[\w\s]+),\s*NE\s*(\d{5})/);
    const phoneMatch = item.content.match(/Phone:\s*([\d\-x()\s]+)/);
    const websiteMatch = item.content.match(/Website:\s*(https?:\/\/[^\s\n]+)/);

    let category = 'other';
    if (item.tags?.some(t => t.includes('buprenorphine'))) category = 'buprenorphine_prescriber';
    else if (item.tags?.some(t => t.includes('substance use'))) category = 'treatment_facility';
    else if (item.tags?.some(t => t.includes('mental health'))) category = 'counseling';

    return {
      title: item.title,
      content: item.content,
      category,
      city: cityMatch ? cityMatch[1].trim() : null,
      state: 'NE',
      zip_code: cityMatch ? cityMatch[2] : null,
      phone: phoneMatch ? phoneMatch[1].trim() : null,
      website: websiteMatch ? websiteMatch[1].trim() : null,
      tags: item.tags || [],
      lat: item.lat || null,
      lon: item.lon || null,
      source_file: 'knowledg.json',
      is_active: true,
    };
  });
}

// ─── Parse Treatment Facility CSV ────────────────────────────────
function parseTreatmentCsv() {
  const raw = readFileSync(
    resolve(ROOT, 'Files/FindTreament_Facility_listing_2026_02_23_204912.csv'),
    'utf-8'
  );
  const lines = raw.split('\n');
  if (lines.length < 2) return [];

  // Parse CSV header
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  // Deduplicate by name + address
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = `${row.name1}|${row.street1}|${row.city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique
    .filter(row => row.state === 'NE') // Only Nebraska facilities
    .map(row => {
      // Build descriptive content
      const services = [];
      if (row.sa) services.push('Substance Abuse Treatment');
      if (row.mh) services.push('Mental Health');
      if (row.dt) services.push('Detoxification');
      if (row.otp) services.push('Opioid Treatment Program');
      if (row.res) services.push('Residential');
      if (row.op) services.push('Outpatient');
      if (row.iop) services.push('Intensive Outpatient');
      if (row.hid) services.push('Hospital Inpatient Detox');
      if (row.tele) services.push('Telehealth');

      const payment = [];
      if (row.md) payment.push('Medicaid');
      if (row.mc) payment.push('Medicare');
      if (row.si || row.pi) payment.push('Private Insurance');
      if (row.cash) payment.push('Cash/Self-Pay');
      if (row.tricare) payment.push('TRICARE');

      const populations = [];
      if (row.adlt) populations.push('Adults');
      if (row.adol) populations.push('Adolescents');
      if (row.sen || row.snr) populations.push('Seniors');
      if (row.wn || row.fem) populations.push('Women');
      if (row.mn || row.male) populations.push('Men');
      if (row.vet) populations.push('Veterans');
      if (row.dui) populations.push('DUI/DWI');
      if (row.pw) populations.push('Pregnant/Postpartum Women');
      if (row.tgd) populations.push('Transgender');

      const name = row.name2 ? `${row.name1} - ${row.name2}` : row.name1;
      const address = [row.street1, row.street2].filter(Boolean).join(', ');

      const contentParts = [name];
      if (address) contentParts.push(`Address: ${address}, ${row.city}, ${row.state} ${row.zip}`);
      if (row.county) contentParts.push(`County: ${row.county}`);
      if (row.phone) contentParts.push(`Phone: ${row.phone}`);
      if (row.website) contentParts.push(`Website: ${row.website}`);
      if (services.length) contentParts.push(`Services: ${services.join(', ')}`);
      if (payment.length) contentParts.push(`Payment: ${payment.join(', ')}`);
      if (populations.length) contentParts.push(`Populations: ${populations.join(', ')}`);

      const tags = ['treatment facility'];
      if (row.sa) tags.push('substance abuse');
      if (row.mh) tags.push('mental health');
      if (row.dt) tags.push('detox');
      if (row.otp) tags.push('opioid treatment');
      if (row.res) tags.push('residential');
      if (row.tele) tags.push('telehealth');

      return {
        title: name,
        content: contentParts.join('\n'),
        category: 'treatment_facility',
        city: row.city || null,
        state: row.state || 'NE',
        zip_code: row.zip || null,
        phone: row.phone || null,
        website: row.website || null,
        tags,
        lat: row.latitude ? parseFloat(row.latitude) : null,
        lon: row.longitude ? parseFloat(row.longitude) : null,
        source_file: 'FindTreament_Facility_listing.csv',
        is_active: true,
      };
    });
}

// ─── Parse AA Meetings (Monday) ──────────────────────────────────
function parseMeetings() {
  const raw = readFileSync(resolve(ROOT, 'Files/meetings-monday.txt'), 'utf-8');
  return raw
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('\t');
      if (parts.length < 6) return null;

      const [time, name, location, format, address, city] = parts.map(s => s.trim());

      const tags = ['aa meeting', 'recovery', 'support group'];
      if (format?.toLowerCase().includes('online')) tags.push('online');
      if (format?.toLowerCase().includes('in-person')) tags.push('in-person');
      if (name?.toLowerCase().includes('women')) tags.push('women');
      if (name?.toLowerCase().includes('men') && !name?.toLowerCase().includes('women')) tags.push('men');
      if (name?.toLowerCase().includes('newcomer')) tags.push('newcomers');
      if (name?.toLowerCase().includes('spanish') || name?.toLowerCase().includes('grupo')) tags.push('spanish');

      const content = [
        `${name} — AA Meeting`,
        `Time: Monday at ${time}`,
        `Location: ${location}`,
        `Format: ${format}`,
        `Address: ${address}, ${city}, NE`,
      ].join('\n');

      return {
        title: `${name} (Monday ${time})`,
        content,
        category: 'aa_meeting',
        city: city || null,
        state: 'NE',
        zip_code: null,
        phone: null,
        website: null,
        tags,
        lat: null,
        lon: null,
        source_file: 'meetings-monday.txt',
        is_active: true,
      };
    })
    .filter(Boolean);
}

// ─── Simple CSV line parser (handles quoted fields) ──────────────
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('Parsing knowledge base files...\n');

  const knowledgeItems = parseKnowledgeJson();
  console.log(`  knowledg.json: ${knowledgeItems.length} items`);

  const treatmentItems = parseTreatmentCsv();
  console.log(`  Treatment CSV: ${treatmentItems.length} facilities (deduplicated, NE only)`);

  const meetingItems = parseMeetings();
  console.log(`  AA Meetings:   ${meetingItems.length} meetings\n`);

  const allItems = [...knowledgeItems, ...treatmentItems, ...meetingItems];
  console.log(`Total: ${allItems.length} items to import\n`);

  // Clear existing imported data (preserves manually-added entries)
  console.log('Clearing previous imports...');
  const { error: deleteError } = await supabase
    .from('knowledge_base')
    .delete()
    .in('source_file', ['knowledg.json', 'FindTreament_Facility_listing.csv', 'meetings-monday.txt']);

  if (deleteError) {
    console.error('Error clearing old data:', deleteError);
    // Continue anyway — table might not exist yet
  }

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('knowledge_base').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i}-${i + batch.length}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    // Progress
    process.stdout.write(`\rImporting... ${inserted}/${allItems.length}`);
  }

  console.log(`\n\nDone! Imported ${inserted} items. ${errors > 0 ? `${errors} errors.` : 'No errors.'}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
