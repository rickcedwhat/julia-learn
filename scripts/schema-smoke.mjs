#!/usr/bin/env node
/**
 * Schema smoke test — verifies the live Supabase DB matches every migration.
 *
 * Parses supabase/migrations/*.sql in order and checks:
 *   CREATE TABLE  → table is reachable via REST
 *   ADD COLUMN    → column is selectable via REST
 *   storage bucket INSERT → bucket exists via Storage API
 *
 * On failure it prints exactly which migration file introduced the missing object.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/schema-smoke.mjs
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

// ── SQL parser ────────────────────────────────────────────────────────────────

function parseMigration(filename, sql) {
  const expectations = []

  // CREATE TABLE [IF NOT EXISTS] tablename
  for (const m of sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?(\w+)\s*\(/gi)) {
    const table = m[1].toLowerCase()
    // skip system tables we don't own
    if (['auth', 'storage', 'objects', 'buckets'].includes(table)) continue
    expectations.push({ kind: 'table', table, migration: filename })
  }

  // ALTER TABLE tablename ADD COLUMN [IF NOT EXISTS] columnname
  for (const m of sql.matchAll(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)\s/gi)) {
    expectations.push({ kind: 'column', table: m[1].toLowerCase(), column: m[2].toLowerCase(), migration: filename })
  }

  // INSERT INTO storage.buckets ... VALUES ('bucket-name', ...)
  for (const m of sql.matchAll(/INSERT INTO storage\.buckets[^)]+\)\s*VALUES\s*\('([^']+)'/gis)) {
    expectations.push({ kind: 'bucket', name: m[1], migration: filename })
  }

  return expectations
}

// ── Checks ────────────────────────────────────────────────────────────────────

async function checkTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=0`, { headers: HEADERS })
  if (res.ok || res.status === 406) return { ok: true } // 406 = no rows but table exists
  const body = await res.json().catch(() => ({}))
  return { ok: false, code: body.code, message: body.message }
}

async function checkColumn(table, column) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=0`, { headers: HEADERS })
  if (res.ok || res.status === 406) return { ok: true }
  const body = await res.json().catch(() => ({}))
  return { ok: false, code: body.code, message: body.message }
}

async function checkBucket(name) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${name}`, { headers: HEADERS })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({}))
  return { ok: false, message: body.message ?? `HTTP ${res.status}` }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const files = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort()

const expectations = []
for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
  expectations.push(...parseMigration(file, sql))
}

let failed = false

for (const exp of expectations) {
  let result

  if (exp.kind === 'table') {
    result = await checkTable(exp.table)
    if (result.ok) {
      console.log(`  ✓  table '${exp.table}'`)
    } else {
      console.error(`  ✗  table '${exp.table}' not found — added by ${exp.migration}`)
      failed = true
    }

  } else if (exp.kind === 'column') {
    result = await checkColumn(exp.table, exp.column)
    if (result.ok) {
      console.log(`  ✓  ${exp.table}.${exp.column}`)
    } else {
      console.error(`  ✗  column '${exp.table}.${exp.column}' not found — added by ${exp.migration}`)
      failed = true
    }

  } else if (exp.kind === 'bucket') {
    result = await checkBucket(exp.name)
    if (result.ok) {
      console.log(`  ✓  bucket '${exp.name}'`)
    } else {
      console.error(`  ✗  storage bucket '${exp.name}' not found — created by ${exp.migration}`)
      failed = true
    }
  }
}

if (failed) {
  console.error('\nSchema smoke test FAILED — apply the missing migrations in Supabase dashboard.')
  process.exit(1)
} else {
  console.log('\nAll schema checks passed ✓')
}
