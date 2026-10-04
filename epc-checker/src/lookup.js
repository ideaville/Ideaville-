#!/usr/bin/env node
import { createClient } from "./client.js";
import {
  filterAddresses,
  groupByAddress,
  loadImprovementCodeMaps,
  summarizeCertificate,
} from "./address.js";
import { fetchAllForPostcode } from "./search.js";

function parseArgs(argv) {
  const args = {
    postcode: null,
    address: null,
    hydrate: false,
    hydrateAll: false,
    text: false,
    pageSize: 5000,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--hydrate" || arg === "--full") {
      args.hydrate = true;
    } else if (arg === "--hydrate-all") {
      args.hydrateAll = true;
      args.hydrate = true;
    } else if (arg === "--text") {
      args.text = true;
    } else if (arg === "--address") {
      args.address = argv[++i];
    } else if (arg.startsWith("--address=")) {
      args.address = arg.slice("--address=".length);
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
        "Usage: npm run lookup -- <postcode> [--address <text>] [--hydrate] [--hydrate-all] [--text]",
        "Examples:",
        "  npm run lookup -- SE18 3EU --text",
        "  npm run lookup -- SE18 3EU --address \"76 Genesta\" --text",
        "  npm run lookup -- SE18 3EU --hydrate-all --text",
      ].join("\n")
    );
  }
  if (!Number.isFinite(args.pageSize) || args.pageSize < 1 || args.pageSize > 5000) {
    throw new Error(`Invalid --page-size: ${args.pageSize}`);
  }
  return args;
}

function renderText(result) {
  const lines = [];
  lines.push(`Postcode ${result.postcode}`);
  lines.push(
    `${result.addressCount} address(es), ${result.certificateCount} certificate(s)`
  );
  lines.push("");

  for (const entry of result.addresses) {
    lines.push(`${entry.address}`);
    lines.push(
      `  UPRN ${entry.uprn ?? "—"} · ${entry.certificateCount} cert(s) · newest ${entry.newest.currentEnergyEfficiencyBand} (${entry.newest.registrationDate}) · ${entry.newest.certificateNumber}`
    );
    if (entry.summary) {
      const s = entry.summary;
      lines.push(
        `  SAP ${s.energyRatingCurrent ?? "—"} → ${s.energyRatingPotential ?? "—"} (${s.currentBand ?? "—"} → ${s.potentialBand ?? "—"}) · ${s.totalFloorArea ?? "—"} m² · ${s.dwellingType ?? "—"}`
      );
      if (s.mainHeating?.length) {
        lines.push(`  Heating: ${s.mainHeating.join("; ")}`);
      }
      if (s.suggestedImprovements?.length) {
        lines.push("  Improvements:");
        for (const item of s.suggestedImprovements.slice(0, 5)) {
          const label = item.summary || item.description || item.improvementType || "Improvement";
          const saving =
            item.typicalSaving && typeof item.typicalSaving === "object"
              ? `£${item.typicalSaving.value}`
              : item.typicalSaving != null
                ? `£${item.typicalSaving}`
                : "—";
          lines.push(
            `    ${item.sequence ?? "-"}. ${label} · ${item.indicativeCost ?? "cost n/a"} · save ~${saving}/yr`
          );
        }
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

  // Hydrate when an address is selected, or when explicitly requested.
  const hydrate =
    args.hydrateAll || args.hydrate || Boolean(args.address);
  const hydrateList = !hydrate
    ? []
    : args.hydrateAll || (!args.address && args.hydrate)
      ? addresses
      : addresses.slice(0, 1);

  const fullCertificates = [];
  for (const entry of hydrateList) {
    const certNumber = entry.newest?.certificateNumber;
    if (!certNumber) continue;
    const cert = await client.getCertificate(certNumber);
    const data = cert?.data ?? cert;
    entry._cert = data;
    fullCertificates.push(data);
  }

  const codeMaps = fullCertificates.length
    ? await loadImprovementCodeMaps(client, fullCertificates)
    : {};

  for (const entry of hydrateList) {
    if (!entry._cert) continue;
    entry.summary = summarizeCertificate(entry._cert, codeMaps);
    if (args.hydrateAll || args.address) {
      entry.fullCertificate = entry._cert;
    }
    delete entry._cert;
  }

  const result = {
    lookedUpAt: new Date().toISOString(),
    postcode: args.postcode,
    addressFilter: args.address,
    pagination,
    certificateCount: rows.length,
    addressCount: addresses.length,
    hydratedCount: addresses.filter((entry) => entry.summary).length,
    addresses,
  };

  if (args.text) {
    console.log(renderText(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
