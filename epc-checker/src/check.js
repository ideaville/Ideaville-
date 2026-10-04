#!/usr/bin/env node
import { createClient } from "./client.js";

function parseArgs(argv) {
  const args = { postcode: null, limit: 10, full: false };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--full") {
      args.full = true;
    } else if (arg === "--limit") {
      args.limit = Number.parseInt(argv[++i], 10);
    } else if (arg.startsWith("--limit=")) {
      args.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    } else {
      positional.push(arg);
    }
  }

  args.postcode = positional.join(" ").trim();
  if (!args.postcode) {
    throw new Error(
      "Usage: npm run check -- <postcode> [--limit 10] [--full]\nExample: npm run check -- SE18 3EU"
    );
  }
  if (!Number.isFinite(args.limit) || args.limit < 1 || args.limit > 5000) {
    throw new Error(`Invalid --limit: ${args.limit}`);
  }
  return args;
}

async function main() {
  const { postcode, limit, full } = parseArgs(process.argv.slice(2));
  const client = createClient();

  const search = await client.searchDomestic({
    postcode,
    page_size: limit,
    current_page: 1,
  });

  const rows = Array.isArray(search.data) ? search.data : [];
  const result = {
    checkedAt: new Date().toISOString(),
    postcode,
    pagination: search.pagination ?? null,
    countReturned: rows.length,
    records: rows,
  };

  if (full && rows[0]?.certificateNumber) {
    const cert = await client.getCertificate(rows[0].certificateNumber);
    result.newestFullCertificate = cert?.data ?? cert;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
