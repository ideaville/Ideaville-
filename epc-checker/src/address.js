/** Format search-row address parts into a single display line. */
export function formatAddress(row) {
  return [row.addressLine1, row.addressLine2, row.addressLine3, row.addressLine4]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

function normalizeKeyPart(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Stable grouping key: prefer UPRN, else normalised address + postcode. */
export function addressKey(row) {
  if (row?.uprn !== undefined && row?.uprn !== null && row?.uprn !== "") {
    return `uprn:${row.uprn}`;
  }
  return `addr:${normalizeKeyPart(formatAddress(row))}|${normalizeKeyPart(row?.postcode)}`;
}

function registrationTime(row) {
  const raw = row?.registrationDate;
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Group search rows into one entry per address, keeping the newest certificate
 * and the full history for that address.
 */
export function groupByAddress(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = addressKey(row);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        uprn: row.uprn ?? null,
        address: formatAddress(row),
        postcode: row.postcode ?? null,
        postTown: row.postTown ?? null,
        council: row.council ?? null,
        constituency: row.constituency ?? null,
        certificates: [],
      };
      groups.set(key, group);
    }
    group.certificates.push(row);
  }

  const addresses = [...groups.values()].map((group) => {
    const certificates = [...group.certificates].sort(
      (a, b) => registrationTime(b) - registrationTime(a)
    );
    const newest = certificates[0];
    return {
      uprn: group.uprn,
      address: group.address,
      postcode: group.postcode,
      postTown: group.postTown,
      council: group.council,
      constituency: group.constituency,
      certificateCount: certificates.length,
      newest: {
        certificateNumber: newest.certificateNumber,
        currentEnergyEfficiencyBand: newest.currentEnergyEfficiencyBand,
        registrationDate: newest.registrationDate,
        schemaType: newest.schemaType ?? null,
      },
      history: certificates.map((row) => ({
        certificateNumber: row.certificateNumber,
        currentEnergyEfficiencyBand: row.currentEnergyEfficiencyBand,
        registrationDate: row.registrationDate,
        schemaType: row.schemaType ?? null,
      })),
    };
  });

  addresses.sort((a, b) => {
    const byAddress = a.address.localeCompare(b.address, "en", {
      numeric: true,
      sensitivity: "base",
    });
    if (byAddress !== 0) return byAddress;
    return String(a.uprn ?? "").localeCompare(String(b.uprn ?? ""));
  });

  return addresses;
}

export function filterAddresses(addresses, addressQuery) {
  if (!addressQuery) return addresses;
  const needle = normalizeKeyPart(addressQuery);
  return addresses.filter((entry) => {
    const hay = `${normalizeKeyPart(entry.address)} ${normalizeKeyPart(entry.postcode)} ${normalizeKeyPart(entry.uprn)}`;
    return hay.includes(needle);
  });
}

function pickCodeValue(entries, schemaType) {
  if (!Array.isArray(entries) || !entries.length) return null;
  if (schemaType) {
    const exact = entries.find((entry) => entry.schemaVersion === schemaType);
    if (exact?.value) return exact.value;
  }
  return entries[entries.length - 1]?.value ?? entries[0]?.value ?? null;
}

/**
 * Pull the product-facing fields from a full certificate payload.
 * Optional `codeMaps` can supply improvement_summary / improvement_description
 * lookups keyed by improvement_number.
 */
export function summarizeCertificate(cert, codeMaps = {}) {
  if (!cert || typeof cert !== "object") return null;

  const summaryMap = codeMaps.improvement_summary ?? {};
  const descriptionMap = codeMaps.improvement_description ?? {};

  const improvements = Array.isArray(cert.suggested_improvements)
    ? cert.suggested_improvements.map((item) => {
        const number = item.improvement_details?.improvement_number;
        const key = number != null ? String(number) : null;
        return {
          sequence: item.sequence ?? null,
          improvementNumber: number ?? null,
          summary: key ? summaryMap[key] ?? null : null,
          description: key ? descriptionMap[key] ?? null : null,
          indicativeCost: item.indicative_cost ?? null,
          typicalSaving: item.typical_saving ?? null,
          improvementType: item.improvement_type ?? null,
          energyPerformanceRating: item.energy_performance_rating ?? null,
        };
      })
    : [];

  const mainHeating = Array.isArray(cert.main_heating)
    ? cert.main_heating.map((item) => item.description).filter(Boolean)
    : [];

  return {
    certificateNumber:
      cert.certificate_number ?? cert.certificateNumber ?? null,
    uprn: cert.uprn ?? null,
    address: [cert.address_line_1, cert.address_line_2, cert.address_line_3, cert.address_line_4]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean)
      .join(", "),
    postcode: cert.postcode ?? null,
    postTown: cert.post_town ?? null,
    dwellingType: cert.dwelling_type ?? null,
    totalFloorArea: cert.total_floor_area ?? null,
    currentBand: cert.current_energy_efficiency_band ?? null,
    potentialBand: cert.potential_energy_efficiency_band ?? null,
    energyRatingCurrent: cert.energy_rating_current ?? null,
    energyRatingPotential: cert.energy_rating_potential ?? null,
    energyConsumptionCurrent: cert.energy_consumption_current ?? null,
    co2EmissionsCurrent: cert.co2_emissions_current ?? null,
    heatingCostCurrent: cert.heating_cost_current ?? null,
    hotWaterCostCurrent: cert.hot_water_cost_current ?? null,
    lightingCostCurrent: cert.lighting_cost_current ?? null,
    mainHeating,
    walls: Array.isArray(cert.walls)
      ? cert.walls.map((item) => item.description).filter(Boolean)
      : [],
    roofs: Array.isArray(cert.roofs)
      ? cert.roofs.map((item) => item.description).filter(Boolean)
      : [],
    window: cert.window?.description ?? null,
    inspectionDate: cert.inspection_date ?? null,
    registrationDate: cert.registration_date ?? null,
    schemaType: cert.schema_type ?? null,
    suggestedImprovements: improvements,
  };
}

/** Build code maps for the improvement numbers present on certificates. */
export async function loadImprovementCodeMaps(client, certificates) {
  const numbers = new Set();
  for (const cert of certificates) {
    for (const item of cert?.suggested_improvements ?? []) {
      const number = item.improvement_details?.improvement_number;
      if (number != null) numbers.add(String(number));
    }
  }

  const maps = {
    improvement_summary: {},
    improvement_description: {},
  };

  for (const code of Object.keys(maps)) {
    for (const key of numbers) {
      try {
        const response = await client.getCodeInfo(code, key);
        const values = response?.data?.[0]?.values ?? [];
        maps[code][key] = pickCodeValue(values);
      } catch {
        maps[code][key] = null;
      }
    }
  }

  return maps;
}
