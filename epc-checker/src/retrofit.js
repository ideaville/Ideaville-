#!/usr/bin/env node
import { createClient } from "./client.js";
import {
  filterAddresses,
  groupByAddress,
  loadImprovementCodeMaps,
  summarizeCertificate,
} from "./address.js";
import { assessRetrofitOpportunity } from "./schemes.js";
import { fetchAllForPostcode } from "./search.js";

function parseArgs(argv) {
  const args = {
    postcode: null,
    address: null,
    minPriority: "medium",
    onlyMatches: false,
    text: false,
    pageSize: 5000,
    limit: null,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--text") {
      args.text = true;
    } else if (arg === "--only-matches") {
      args.onlyMatches = true;
    } else if (arg === "--address") {
      args.address = argv[++i];
    } else if (arg.startsWith("--address=")) {
      args.address = arg.slice("--address=".length);
    } else if (arg === "--min-priority") {
      args.minPriority = argv[++i];
    } else if (arg.startsWith("--min-priority=")) {
      args.minPriority = arg.slice("--min-priority=".length);
    } else if (arg === "--limit") {
      args.limit = Number.parseInt(argv[++i], 10);
    } else if (arg.startsWith("--limit=")) {
      args.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    } else if (arg === "--page-size") {
      args.pageSize = Number.parseInt(argv[++i], 10);
    } else if (arg.startsWith("--page-size=")) {
      args.pageSize = Number.parseInt(arg.slice("--page-size=".length), 10);
    } else {
      positional.push(arg);
    }
  }

  args.postcode = positional.join(" ").trim();
  if (!args.postcode) {
    throw new Error(
      [
        "Usage: npm run retrofit -- <postcode> [--address <text>] [--min-priority medium|high|low] [--only-matches] [--limit N] [--text]",
        "Examples:",
        "  npm run retrofit -- SE18 3EU --text",
        "  npm run retrofit -- SE18 3EU --min-priority high --only-matches --text",
        "  npm run retrofit -- SE18 3EU --address \"84 Genesta\" --text",
      ].join("\n")
    );
  }

  const allowed = new Set(["low", "medium", "high"]);
  if (!allowed.has(args.minPriority)) {
    throw new Error(`Invalid --min-priority: ${args.minPriority}`);
  }
  if (args.limit != null && (!Number.isFinite(args.limit) || args.limit < 1)) {
    throw new Error(`Invalid --limit: ${args.limit}`);
  }
  return args;
}

const PRIORITY_RANK = { low: 1, medium: 2, high: 3 };

function passesPriority(priority, minimum) {
  return (PRIORITY_RANK[priority] || 0) >= (PRIORITY_RANK[minimum] || 0);
}

function formatSaving(saving) {
  if (saving && typeof saving === "object" && saving.value != null) {
    return `£${saving.value}/yr`;
  }
  if (saving != null) return `£${saving}/yr`;
  return "—";
}

function renderText(result) {
  const lines = [];
  lines.push(`Retrofit / grant screen for ${result.postcode}`);
  lines.push(
    `${result.addressCount} address(es) assessed · ${result.needsRetrofitCount} need retrofit · ${result.schemeLeadCount} with scheme leads`
  );
  lines.push(
    "Property-side screening only — income/benefits/funding queues still need human checks."
  );
  lines.push("");

  for (const entry of result.addresses) {
    const a = entry.assessment;
    lines.push(`${entry.address}`);
    lines.push(
      `  ${a.band ?? "?"} → ${a.potentialBand ?? "?"} · SAP ${a.sap ?? "—"} → ${a.sapPotential ?? "—"} · ${a.tenure} · ${a.propertyType} · priority ${a.priority}`
    );
    lines.push(`  Heating: ${a.heating.detail || a.heating.category}`);
    if (a.retrofitSignals.length) {
      lines.push(`  Why retrofit: ${a.retrofitSignals.slice(0, 3).join("; ")}`);
    }

    const leads = a.schemes.filter((scheme) =>
      ["likely_property_match", "possible", "action_needed"].includes(scheme.status)
    );
    if (leads.length) {
      lines.push("  Scheme leads:");
      for (const scheme of leads) {
        lines.push(`    - ${scheme.name} [${scheme.status}/${scheme.confidence}]`);
        if (scheme.reasons[0]) lines.push(`      ${scheme.reasons[0]}`);
      }
    } else {
      lines.push("  Scheme leads: none from EPC fields alone");
    }

    if (entry.summary?.suggestedImprovements?.length) {
      lines.push("  Top improvements:");
      for (const item of entry.summary.suggestedImprovements.slice(0, 3)) {
        const label = item.summary || item.description || item.improvementType || "Improvement";
        lines.push(
          `    ${item.sequence ?? "-"}. ${label} · ${item.indicativeCost ?? "cost n/a"} · save ~${formatSaving(item.typicalSaving)}`
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = createClient();
  const { rows, pagination } = await fetchAllForPostcode(
    client,
    args.postcode,
    args.pageSize
  );

  let addresses = filterAddresses(groupByAddress(rows), args.address);
  if (args.address && addresses.length === 0) {
    throw new Error(`No addresses matched --address ${JSON.stringify(args.address)}`);
  }
  if (args.limit != null) {
    addresses = addresses.slice(0, args.limit);
  }

  const fullCertificates = [];
  for (const entry of addresses) {
    const certNumber = entry.newest?.certificateNumber;
    if (!certNumber) continue;
    const cert = await client.getCertificate(certNumber);
    entry._cert = cert?.data ?? cert;
    fullCertificates.push(entry._cert);
  }

  const codeMaps = fullCertificates.length
    ? await loadImprovementCodeMaps(client, fullCertificates)
    : {};

  const assessed = [];
  for (const entry of addresses) {
    const summary = summarizeCertificate(entry._cert, codeMaps);
    const assessment = assessRetrofitOpportunity({
      searchNewest: entry.newest,
      summary,
      cert: entry._cert,
      council: entry.council,
    });
    delete entry._cert;

    const record = {
      uprn: entry.uprn,
      address: entry.address,
      postcode: entry.postcode,
      council: entry.council,
      newest: entry.newest,
      summary,
      assessment,
    };

    const hasLead = assessment.matchingSchemeIds.some((id) => id !== "gbis");
    const include =
      passesPriority(assessment.priority, args.minPriority) &&
      (!args.onlyMatches || (assessment.needsRetrofit && hasLead));

    if (include) assessed.push(record);
  }

  assessed.sort((a, b) => {
    const byPriority =
      (PRIORITY_RANK[b.assessment.priority] || 0) -
      (PRIORITY_RANK[a.assessment.priority] || 0);
    if (byPriority !== 0) return byPriority;
    return a.address.localeCompare(b.address, "en", { numeric: true });
  });

  const result = {
    assessedAt: new Date().toISOString(),
    postcode: args.postcode,
    addressFilter: args.address,
    minPriority: args.minPriority,
    onlyMatches: args.onlyMatches,
    pagination,
    certificateCount: rows.length,
    addressCount: assessed.length,
    needsRetrofitCount: assessed.filter((entry) => entry.assessment.needsRetrofit).length,
    schemeLeadCount: assessed.filter((entry) =>
      entry.assessment.matchingSchemeIds.some((id) => id !== "gbis")
    ).length,
    caveats: [
      "Property-side screening from EPC register fields only.",
      "Income, benefits, and live local funding queues are not verified here.",
      "GBIS is reported as closed (31 Mar 2026).",
    ],
    addresses: assessed,
  };

  if (args.text) console.log(renderText(result));
  else console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
