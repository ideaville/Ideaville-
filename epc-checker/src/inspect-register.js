#!/usr/bin/env node
import { createClient } from "./client.js";

function parseLimit(argv) {
  const raw = argv[0] ?? "10";
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > 5000) {
    throw new Error(`Expected page size 1–5000, got: ${raw}`);
  }
  return limit;
}

function summarize(rows) {
  const fieldCounts = new Map();
  const bands = new Map();
  const towns = new Map();
  const constituencies = new Map();
  const schemas = new Map();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);
    }
    const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);
    bump(bands, row.currentEnergyEfficiencyBand ?? "(missing)");
    bump(towns, row.postTown ?? "(missing)");
    bump(constituencies, row.constituency ?? "(missing)");
    bump(schemas, row.schemaType ?? "(missing)");
  }

  const sorted = (map) =>
    [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return {
    recordCount: rows.length,
    searchFields: sorted(fieldCounts).map(([field, count]) => ({
      field,
      presentIn: count,
    })),
    currentEnergyEfficiencyBand: Object.fromEntries(sorted(bands)),
    postTown: Object.fromEntries(sorted(towns)),
    constituency: Object.fromEntries(sorted(constituencies)),
    schemaType: Object.fromEntries(sorted(schemas)),
  };
}

async function main() {
  const limit = parseLimit(process.argv.slice(2));
  const client = createClient();

  const search = await client.searchDomestic({
    "council[]": ["Greenwich"],
    page_size: limit,
    current_page: 1,
  });

  const rows = Array.isArray(search.data) ? search.data : [];
  const summary = summarize(rows);

  const fullSamples = [];
  for (const row of rows.slice(0, Math.min(2, rows.length))) {
    const cert = await client.getCertificate(row.certificateNumber);
    const data = cert?.data ?? cert;
    fullSamples.push({
      certificateNumber: row.certificateNumber,
      searchRecord: row,
      certificateFieldCount: data && typeof data === "object" ? Object.keys(data).length : 0,
      certificateFields: data && typeof data === "object" ? Object.keys(data).sort() : [],
      certificate: data,
    });
  }

  const report = {
    inspectedAt: new Date().toISOString(),
    council: "Greenwich",
    request: {
      endpoint: "/api/domestic/search",
      params: { "council[]": "Greenwich", page_size: limit, current_page: 1 },
    },
    pagination: search.pagination ?? null,
    summary,
    records: rows,
    fullCertificateSamples: fullSamples,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
