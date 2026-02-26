/**
 * Build Nebraska Resource Master JSON
 *
 * Reads all four source files, normalizes into a unified schema,
 * deduplicates by name+city, and writes the master JSON output.
 *
 * Usage:
 *   node scripts/build-master-json.cjs
 *
 * Sources:
 *   1. Files/knowledg.json              — 290 items (treatment, prescribers, counseling)
 *   2. Files/FindTreament_Facility_listing_2026_02_23_204912.csv — ~277 NE facilities
 *   3. Files/meetings-monday.txt        — ~131 AA meetings
 *   4. src/data/nebraskaResources.json   — 85 community resources
 *
 * Output:
 *   Files/nebraska-resource-master.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ─── Utility: Simple CSV line parser (handles quoted fields) ─────────────
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

// ─── 1. Parse knowledg.json ──────────────────────────────────────────────
function parseKnowledgeJson() {
  const raw = fs.readFileSync(path.resolve(ROOT, 'Files/knowledg.json'), 'utf-8');
  const data = JSON.parse(raw);

  return data.items.map((item) => {
    // Extract structured fields from content text
    const addressMatch = item.content.match(/Address:\s*(.+?)(?:\n|$)/);
    const phoneMatch = item.content.match(/Phone:\s*([\d\-x()\s]+)/);
    const websiteMatch = item.content.match(/Website:\s*(https?:\/\/[^\s\n]+)/);
    const servicesMatch = item.content.match(/Services:\s*(.+?)(?:\n|$)/);
    const approachesMatch = item.content.match(/Approaches:\s*(.+?)(?:\n|$)/);
    const paymentMatch = item.content.match(/Payment:\s*(.+?)(?:\n|$)/);
    const populationsMatch = item.content.match(/Populations:\s*(.+?)(?:\n|$)/);

    // Extract city/zip from address line
    const cityMatch = item.content.match(/,\s*(\w[\w\s]+?),\s*NE\s*(\d{5})/);

    // Extract full address (just the street part before city)
    let addressStr = null;
    if (addressMatch) {
      const fullAddr = addressMatch[1].trim();
      // Try to get just street address (before city, NE zip)
      const streetMatch = fullAddr.match(/^(.+?),\s*\w[\w\s]+?,\s*NE/);
      addressStr = streetMatch ? streetMatch[1].trim() : fullAddr;
    }

    // Determine category from tags
    let category = 'other';
    if (item.tags?.some(t => t.includes('buprenorphine'))) category = 'buprenorphine_prescriber';
    else if (item.tags?.some(t => t.includes('substance use'))) category = 'treatment_facility';
    else if (item.tags?.some(t => t.includes('mental health'))) category = 'counseling';

    // Build services array
    const services = [];
    if (servicesMatch) {
      services.push(...servicesMatch[1].split(',').map(s => s.trim()).filter(Boolean));
    }
    if (approachesMatch) {
      services.push(...approachesMatch[1].split(',').map(s => s.trim()).filter(Boolean));
    }

    // Build tags array
    const tags = [...(item.tags || [])];
    if (paymentMatch) {
      const payments = paymentMatch[1].split(',').map(s => s.trim().toLowerCase());
      if (payments.some(p => p.includes('medicaid'))) tags.push('medicaid');
      if (payments.some(p => p.includes('medicare'))) tags.push('medicare');
      if (payments.some(p => p.includes('sliding'))) tags.push('sliding-fee');
    }
    if (populationsMatch) {
      const pops = populationsMatch[1].split(',').map(s => s.trim().toLowerCase());
      if (pops.some(p => p.includes('veteran'))) tags.push('veterans');
      if (pops.some(p => p.includes('adolescent') || p.includes('children'))) tags.push('youth');
      if (pops.some(p => p.includes('women'))) tags.push('women');
      if (pops.some(p => p.includes('transgender'))) tags.push('transgender');
      if (pops.some(p => p.includes('spanish'))) tags.push('spanish');
    }

    return {
      title: item.title,
      content: item.content,
      category,
      city: cityMatch ? cityMatch[1].trim() : null,
      state: 'NE',
      zip_code: cityMatch ? cityMatch[2] : null,
      phone: phoneMatch ? phoneMatch[1].trim() : null,
      website: websiteMatch ? websiteMatch[1].trim() : null,
      hours: null,
      address: addressStr,
      eligibility: null,
      lat: item.lat || null,
      lon: item.lon || null,
      tags: [...new Set(tags)],
      services,
      source: 'knowledg.json',
    };
  });
}

// ─── 2. Parse Treatment Facility CSV ─────────────────────────────────────
function parseTreatmentCsv() {
  const raw = fs.readFileSync(
    path.resolve(ROOT, 'Files/FindTreament_Facility_listing_2026_02_23_204912.csv'),
    'utf-8'
  );
  const lines = raw.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  // Deduplicate by name + street + city (CSV has duplicate rows for MH/SU)
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = `${row.name1}|${row.street1}|${row.city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique
    .filter(row => row.state === 'NE')
    .map(row => {
      // Map single-char columns to service names
      const services = [];
      if (row.sa === '1') services.push('Substance Abuse Treatment');
      if (row.mh === '1') services.push('Mental Health');
      if (row.dt === '1') services.push('Detoxification');
      if (row.otp === '1') services.push('Opioid Treatment Program');
      if (row.res === '1') services.push('Residential');
      if (row.op === '1') services.push('Outpatient');
      if (row.iop === '1') services.push('Intensive Outpatient');
      if (row.hid === '1') services.push('Hospital Inpatient Detox');
      if (row.tele === '1') services.push('Telehealth');
      if (row.php === '1') services.push('Partial Hospitalization');
      if (row.bum === '1' || row.bu === '1') services.push('MAT: Buprenorphine');
      if (row.vtrl === '1') services.push('MAT: Vivitrol');
      if (row.nxn === '1') services.push('MAT: Naltrexone');
      if (row.meth === '1') services.push('MAT: Methadone');
      if (row.cm === '1') services.push('Case Management');
      if (row.peer === '1') services.push('Peer Support Services');
      if (row.cbt === '1') services.push('CBT');
      if (row.dbt === '1') services.push('DBT');
      if (row.emdr === '1') services.push('EMDR');
      if (row.cft === '1') services.push('Couples/Family Therapy');
      if (row.gt === '1') services.push('Group Therapy');
      if (row.idd === '1') services.push('Integrated Dual Diagnosis');

      const payment = [];
      if (row.md === '1') payment.push('Medicaid');
      if (row.mc === '1') payment.push('Medicare');
      if (row.si === '1' || row.pi === '1') payment.push('Private Insurance');
      if (row.cash === '1') payment.push('Cash/Self-Pay');
      if (row.tricare === '1') payment.push('TRICARE');
      if (row.np === '1') payment.push('No Payment Accepted');

      const populations = [];
      if (row.adlt === '1') populations.push('Adults');
      if (row.adol === '1') populations.push('Adolescents');
      if (row.sen === '1' || row.snr === '1') populations.push('Seniors');
      if (row.wn === '1' || row.fem === '1') populations.push('Women');
      if (row.mn === '1' || row.male === '1') populations.push('Men');
      if (row.vet === '1') populations.push('Veterans');
      if (row.dui === '1') populations.push('DUI/DWI');
      if (row.pw === '1') populations.push('Pregnant/Postpartum Women');
      if (row.tgd === '1') populations.push('Transgender');
      if (row.cj === '1') populations.push('Criminal Justice');
      if (row.hiv === '1') populations.push('HIV/AIDS');
      if (row.trma === '1') populations.push('Trauma');
      if (row.smi === '1') populations.push('Serious Mental Illness');
      if (row.ptsd === '1') populations.push('PTSD');

      const name = row.name2 ? `${row.name1} - ${row.name2}` : row.name1;
      const address = [row.street1, row.street2].filter(Boolean).join(', ');

      // Build content text
      const contentParts = [name];
      if (address) contentParts.push(`Address: ${address}, ${row.city}, ${row.state} ${row.zip}`);
      if (row.county) contentParts.push(`County: ${row.county}`);
      if (row.phone) contentParts.push(`Phone: ${row.phone}`);
      if (row.website && row.website !== 'https://') contentParts.push(`Website: ${row.website}`);
      contentParts.push(`Type: ${row.type_facility}`);
      if (services.length) contentParts.push(`Services: ${services.join(', ')}`);
      if (payment.length) contentParts.push(`Payment: ${payment.join(', ')}`);
      if (populations.length) contentParts.push(`Populations: ${populations.join(', ')}`);

      // Determine category based on type_facility
      let category = 'treatment_facility';
      if (row.type_facility === 'BUPREN') category = 'buprenorphine_prescriber';

      // Build tags
      const tags = ['treatment facility'];
      if (row.sa === '1') tags.push('substance abuse');
      if (row.mh === '1') tags.push('mental health');
      if (row.dt === '1') tags.push('detox');
      if (row.otp === '1') tags.push('opioid treatment');
      if (row.res === '1') tags.push('residential');
      if (row.tele === '1') tags.push('telehealth');
      if (row.bum === '1' || row.bu === '1') tags.push('mat');
      if (row.vtrl === '1') tags.push('mat');
      if (row.nxn === '1') tags.push('mat');
      if (row.vet === '1') tags.push('veterans');
      if (row.sp === '1') tags.push('spanish');
      if (row.asl === '1') tags.push('asl');
      if (row.md === '1') tags.push('medicaid');
      if (row.mc === '1') tags.push('medicare');

      const websiteClean = (row.website && row.website !== 'https://') ? row.website : null;

      return {
        title: name,
        content: contentParts.join('\n'),
        category,
        city: row.city || null,
        state: row.state || 'NE',
        zip_code: row.zip || null,
        phone: row.phone || null,
        website: websiteClean,
        hours: null,
        address: address || null,
        eligibility: null,
        lat: row.latitude ? parseFloat(row.latitude) : null,
        lon: row.longitude ? parseFloat(row.longitude) : null,
        tags: [...new Set(tags)],
        services,
        source: 'treatment_csv',
      };
    });
}

// ─── 3. Parse AA Meetings ────────────────────────────────────────────────
function parseMeetings() {
  const raw = fs.readFileSync(path.resolve(ROOT, 'Files/meetings-monday.txt'), 'utf-8');

  return raw
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('\t');
      if (parts.length < 6) return null;

      const [time, name, location, format, address, city] = parts.map(s => s.trim());

      const tags = ['aa meeting', 'recovery', 'support group', 'monday'];
      if (format?.toLowerCase().includes('online')) tags.push('online');
      if (format?.toLowerCase().includes('in-person')) tags.push('in-person');
      if (name?.toLowerCase().includes('women')) tags.push('women');
      if (name?.toLowerCase().includes('men') && !name?.toLowerCase().includes('women') && !name?.toLowerCase().includes('ment')) tags.push('men');
      if (name?.toLowerCase().includes('newcomer')) tags.push('newcomers');
      if (name?.toLowerCase().includes('grupo') || name?.toLowerCase().includes('spanish')) tags.push('spanish');
      if (name?.toLowerCase().includes('big book') || name?.toLowerCase().includes('bb study')) tags.push('big book');
      if (name?.toLowerCase().includes('step')) tags.push('steps');

      const services = ['AA Meeting'];
      if (format?.toLowerCase().includes('online')) services.push('Online Meeting');
      if (format?.toLowerCase().includes('in-person')) services.push('In-Person Meeting');

      const content = [
        `${name} -- AA Meeting`,
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
        hours: `Monday at ${time}`,
        address: address || null,
        eligibility: null,
        lat: null,
        lon: null,
        tags: [...new Set(tags)],
        services,
        source: 'meetings_monday',
      };
    })
    .filter(Boolean);
}

// ─── 4. Parse nebraskaResources.json ─────────────────────────────────────
function parseCommunityResources() {
  const raw = fs.readFileSync(
    path.resolve(ROOT, 'src/data/nebraskaResources.json'),
    'utf-8'
  );
  const data = JSON.parse(raw);

  return data.resources.map((r) => {
    // Map type to category
    let category = r.type; // shelter, food, crisis, medical, legal stay as-is
    const validDirectCategories = ['shelter', 'food', 'crisis', 'medical', 'legal'];

    if (!validDirectCategories.includes(r.type)) {
      // It's "other" -- apply sub-mapping rules
      const nameLower = r.name.toLowerCase();
      if (
        nameLower.includes('job center') ||
        nameLower.includes('department of labor') ||
        nameLower.includes('vocational')
      ) {
        category = 'employment';
      } else if (
        nameLower.includes('accessnebraska') ||
        nameLower.includes('social security')
      ) {
        category = 'government';
      } else if (
        nameLower.includes('boys town') ||
        nameLower.includes('project harmony') ||
        nameLower.includes('youth') ||
        nameLower.includes('nchs') ||
        nameLower.includes("nebraska children's home")
      ) {
        category = 'youth';
      } else {
        category = 'other';
      }
    }

    // Build content text
    const contentParts = [r.name];
    if (r.description) contentParts.push(r.description);
    if (r.address) contentParts.push(`Address: ${r.address}, ${r.city}, ${r.state} ${r.zip_code || ''}`);
    if (r.phone) contentParts.push(`Phone: ${r.phone}`);
    if (r.website) contentParts.push(`Website: ${r.website}`);
    if (r.hours) contentParts.push(`Hours: ${r.hours}`);
    if (r.eligibility) contentParts.push(`Eligibility: ${r.eligibility}`);
    if (r.services?.length) contentParts.push(`Services: ${r.services.join(', ')}`);

    // Build tags from type and services
    const tags = [r.type];
    if (category !== r.type) tags.push(category);
    if (r.services) {
      for (const svc of r.services) {
        const svcLower = svc.toLowerCase();
        if (svcLower.includes('crisis')) tags.push('crisis');
        if (svcLower.includes('shelter')) tags.push('shelter');
        if (svcLower.includes('meal') || svcLower.includes('food')) tags.push('food');
        if (svcLower.includes('legal')) tags.push('legal');
        if (svcLower.includes('counseling') || svcLower.includes('mental health')) tags.push('mental health');
      }
    }

    return {
      title: r.name,
      content: contentParts.join('\n'),
      category,
      city: r.city || null,
      state: r.state || 'NE',
      zip_code: r.zip_code || null,
      phone: r.phone || null,
      website: r.website || null,
      hours: r.hours || null,
      address: r.address || null,
      eligibility: r.eligibility || null,
      lat: null,
      lon: null,
      tags: [...new Set(tags)],
      services: r.services || [],
      source: 'community_resources',
    };
  });
}

// ─── Deduplication ───────────────────────────────────────────────────────
function deduplicateResources(resources) {
  // Group by normalized name + city key
  const groups = new Map();

  for (const r of resources) {
    const nameKey = (r.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cityKey = (r.city || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `${nameKey}__${cityKey}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(r);
  }

  const deduped = [];
  for (const [, group] of groups) {
    if (group.length === 1) {
      deduped.push(group[0]);
      continue;
    }

    // Pick the most detailed version (longest content)
    group.sort((a, b) => (b.content || '').length - (a.content || '').length);
    const best = { ...group[0] };

    // Merge fields from other versions (fill in nulls)
    for (let i = 1; i < group.length; i++) {
      const other = group[i];
      if (!best.phone && other.phone) best.phone = other.phone;
      if (!best.website && other.website) best.website = other.website;
      if (!best.hours && other.hours) best.hours = other.hours;
      if (!best.address && other.address) best.address = other.address;
      if (!best.eligibility && other.eligibility) best.eligibility = other.eligibility;
      if (!best.lat && other.lat) best.lat = other.lat;
      if (!best.lon && other.lon) best.lon = other.lon;
      if (!best.zip_code && other.zip_code) best.zip_code = other.zip_code;

      // Merge tags
      if (other.tags) {
        const merged = new Set([...(best.tags || []), ...other.tags]);
        best.tags = [...merged];
      }

      // Merge services
      if (other.services) {
        const merged = new Set([...(best.services || []), ...other.services]);
        best.services = [...merged];
      }
    }

    deduped.push(best);
  }

  return deduped;
}

// ─── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log('Building Nebraska Resource Master JSON...\n');

  // Parse all four sources
  const knowledgeItems = parseKnowledgeJson();
  console.log(`  knowledg.json:           ${knowledgeItems.length} items`);

  const treatmentItems = parseTreatmentCsv();
  console.log(`  Treatment CSV:           ${treatmentItems.length} facilities (deduplicated, NE only)`);

  const meetingItems = parseMeetings();
  console.log(`  AA Meetings (Monday):    ${meetingItems.length} meetings`);

  const communityItems = parseCommunityResources();
  console.log(`  Community Resources:     ${communityItems.length} resources`);

  // Combine all
  const allItems = [...knowledgeItems, ...treatmentItems, ...meetingItems, ...communityItems];
  console.log(`\n  Combined total:          ${allItems.length} items`);

  // Deduplicate
  const deduped = deduplicateResources(allItems);
  console.log(`  After deduplication:     ${deduped.length} unique resources`);
  console.log(`  Removed duplicates:      ${allItems.length - deduped.length}`);

  // Sort by category then title
  deduped.sort((a, b) => {
    const catCmp = (a.category || '').localeCompare(b.category || '');
    if (catCmp !== 0) return catCmp;
    return (a.title || '').localeCompare(b.title || '');
  });

  // Build category and source counts
  const categories = {};
  const sources = {};
  for (const r of deduped) {
    categories[r.category] = (categories[r.category] || 0) + 1;
    sources[r.source] = (sources[r.source] || 0) + 1;
  }

  // Build output
  const output = {
    metadata: {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      state: 'Nebraska',
      totalResources: deduped.length,
      categories,
      sources,
    },
    resources: deduped,
  };

  // Write output
  const outputPath = path.resolve(ROOT, 'Files/nebraska-resource-master.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n  Output written to: ${outputPath}`);
  console.log(`  Total resources:   ${deduped.length}`);
  console.log('\n  Categories:');
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat.padEnd(25)} ${count}`);
  }
  console.log('\n  Sources:');
  for (const [src, count] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${src.padEnd(25)} ${count}`);
  }
  console.log('\nDone!');
}

main();
