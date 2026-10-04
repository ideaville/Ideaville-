const BAND_RANK = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };

export const TENURE_LABELS = {
  1: "owner-occupied",
  2: "rental (social)",
  3: "rental (private)",
  ND: "unknown",
};

export const PROPERTY_TYPE_LABELS = {
  0: "House",
  1: "Bungalow",
  2: "Flat",
  3: "Maisonette",
  4: "Park home",
};

function bandRank(band) {
  if (!band) return null;
  return BAND_RANK[String(band).toUpperCase()] ?? null;
}

function bandIn(band, allowed) {
  if (!band) return false;
  return allowed.includes(String(band).toUpperCase());
}

function textBlob(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (Array.isArray(value)) return value.map(textBlob).join(" ");
  if (typeof value === "object") {
    return Object.values(value).map(textBlob).join(" ");
  }
  return String(value).toLowerCase();
}

export function detectHeatingCategory(cert = {}) {
  const blob = [
    textBlob(cert.main_heating),
    textBlob(cert.secondary_heating),
    textBlob(cert.sap_energy_source),
    textBlob(cert.sap_heating),
  ].join(" ");

  if (!blob.trim()) return { category: "unknown", detail: null };

  if (/\bheat pump\b|\bashp\b|\bgshp\b|\bair.source\b|\bground.source\b/.test(blob)) {
    return { category: "heat_pump", detail: "Existing heat pump indicated" };
  }
  if (/\boil\b|\blpg\b|\bliquefied petroleum\b|\bcoal\b|\bsolid fuel\b/.test(blob)) {
    return { category: "fossil_off_gas", detail: "Oil/LPG/coal/solid fuel indicated" };
  }
  if (
    /\bmains gas\b|\bgas boiler\b|\bboiler and radiators, mains gas\b/.test(blob) ||
    cert.sap_energy_source?.mains_gas === "Y"
  ) {
    return { category: "mains_gas", detail: "Mains gas heating indicated" };
  }
  if (/\belectric\b|\bstorage heater\b|\bpanel heater\b/.test(blob)) {
    return { category: "electric", detail: "Electric heating indicated" };
  }
  return { category: "other", detail: "Heating present but category unclear" };
}

export function detectFabricFlags(cert = {}, improvementSummaries = []) {
  const wallText = textBlob(cert.walls);
  const roofText = textBlob(cert.roofs);
  const improvementText = improvementSummaries.map(textBlob).join(" ");

  return {
    solidWallLikely: /solid brick|solid wall|granite or whinstone|sandstone/.test(wallText),
    uninsulatedWallLikely: /no insulation|as built, no insulation/.test(wallText),
    loftTopUpLikely:
      /loft insulation/.test(improvementText) ||
      /(?:^|[^0-9])(?:50|75|100|125|150) mm loft insulation/.test(roofText),
    floorInsulationSuggested: /floor insulation/.test(improvementText),
    glazingUpgradeSuggested: /glazing|double glazing|triple glazing/.test(improvementText),
  };
}

function makeScheme({
  id,
  name,
  status,
  confidence,
  reasons,
  blockers = [],
  nextSteps = [],
  links = [],
}) {
  return { id, name, status, confidence, reasons, blockers, nextSteps, links };
}

/**
 * Score retrofit need + possible grant/scheme fit from an EPC summary/cert.
 * This is property-side screening only — income/benefits/council-tax are not on the register.
 */
/** Local delivery notes that can be inferred from council name. */
export function localSchemeNotes(council) {
  const name = String(council || "").toLowerCase();
  if (name.includes("greenwich")) {
    return [
      "Greenwich is in the GLA Warm Homes: Local Grant consortium (private low-income homes).",
      "Greenwich also has Warm Homes: Social Housing Fund activity for council/housing-association stock.",
      "Private residents: check Warmer Homes London / local council referral routes.",
    ];
  }
  return [];
}

export function assessRetrofitOpportunity({
  searchNewest,
  summary,
  cert,
  council,
  asOf = new Date(),
} = {}) {
  const band =
    summary?.currentBand ??
    searchNewest?.currentEnergyEfficiencyBand ??
    cert?.current_energy_efficiency_band ??
    null;
  const potentialBand =
    summary?.potentialBand ?? cert?.potential_energy_efficiency_band ?? null;
  const sap =
    summary?.energyRatingCurrent ?? cert?.energy_rating_current ?? null;
  const sapPotential =
    summary?.energyRatingPotential ?? cert?.energy_rating_potential ?? null;
  const tenureCode = cert?.tenure != null ? String(cert.tenure) : null;
  const tenure = TENURE_LABELS[tenureCode] ?? (tenureCode ? `code:${tenureCode}` : "unknown");
  const propertyTypeCode =
    cert?.property_type != null ? String(cert.property_type) : null;
  const propertyType =
    PROPERTY_TYPE_LABELS[propertyTypeCode] ??
    (propertyTypeCode ? `code:${propertyTypeCode}` : summary?.dwellingType ?? "unknown");

  const heating = detectHeatingCategory(cert || {});
  const improvementSummaries = (summary?.suggestedImprovements || []).map(
    (item) => item.summary || item.description || ""
  );
  const fabric = detectFabricFlags(cert || {}, improvementSummaries);

  const registrationDate =
    summary?.registrationDate ??
    searchNewest?.registrationDate ??
    cert?.registration_date ??
    null;
  const registrationMs = registrationDate ? Date.parse(registrationDate) : NaN;
  const ageYears = Number.isFinite(registrationMs)
    ? (asOf.getTime() - registrationMs) / (365.25 * 24 * 60 * 60 * 1000)
    : null;
  const epcLikelyExpired = ageYears != null ? ageYears >= 10 : null;

  const currentRank = bandRank(band);
  const potentialRank = bandRank(potentialBand);
  const bandGap =
    currentRank != null && potentialRank != null
      ? Math.max(0, currentRank - potentialRank)
      : null;
  const sapGap =
    sap != null && sapPotential != null ? Number(sapPotential) - Number(sap) : null;

  const retrofitSignals = [];
  if (bandIn(band, ["D", "E", "F", "G"])) {
    retrofitSignals.push(`Current EPC band ${band} (below C)`);
  }
  if (bandIn(band, ["E", "F", "G"])) {
    retrofitSignals.push(`Lower band ${band} indicates stronger fabric/heating need`);
  }
  if (sapGap != null && sapGap >= 10) {
    retrofitSignals.push(`SAP uplift available ≈ ${sapGap} points (${sap} → ${sapPotential})`);
  }
  if (bandGap != null && bandGap >= 1) {
    retrofitSignals.push(`Potential band improves to ${potentialBand}`);
  }
  if (improvementSummaries.length) {
    retrofitSignals.push(
      `${improvementSummaries.length} lodged improvement recommendation(s)`
    );
  }
  if (fabric.solidWallLikely || fabric.uninsulatedWallLikely) {
    retrofitSignals.push("Wall construction/insulation suggests retrofit opportunity");
  }
  if (fabric.loftTopUpLikely) {
    retrofitSignals.push("Loft insulation top-up indicated");
  }
  if (heating.category === "mains_gas" || heating.category === "fossil_off_gas") {
    retrofitSignals.push(`Fossil heating present (${heating.category})`);
  }
  if (epcLikelyExpired) {
    retrofitSignals.push(
      `Newest EPC is ~${ageYears.toFixed(1)} years old (often treated as expired)`
    );
  }

  const needsRetrofit = retrofitSignals.length > 0 && bandIn(band, ["D", "E", "F", "G"]);
  const priority =
    bandIn(band, ["F", "G"])
      ? "high"
      : bandIn(band, ["E"])
        ? "high"
        : bandIn(band, ["D"])
          ? "medium"
          : "low";

  const schemes = [];

  // Warm Homes: Local Grant — England, private homes, EPC D–G; income/LA still required.
  {
    const reasons = [];
    const blockers = [];
    if (bandIn(band, ["D", "E", "F", "G"])) {
      reasons.push(`EPC band ${band} is within D–G`);
    } else if (band) {
      blockers.push(`EPC band ${band} is outside D–G`);
    } else {
      blockers.push("No EPC band available");
    }

    if (tenure === "owner-occupied" || tenure === "rental (private)") {
      reasons.push(`Tenure appears ${tenure}`);
    } else if (tenure === "rental (social)") {
      blockers.push("Social rented homes are generally out of scope (see Warm Homes: Social Housing Fund)");
    } else {
      blockers.push("Tenure unknown on certificate — confirm owner-occupied or private rented");
    }

    reasons.push("Household income/benefits/postcode route still needs local-authority confirmation");
    for (const note of localSchemeNotes(council)) reasons.push(note);

    schemes.push(
      makeScheme({
        id: "warm-homes-local-grant",
        name: "Warm Homes: Local Grant",
        status: blockers.some((b) => b.startsWith("EPC band") || b.startsWith("Social"))
          ? "unlikely"
          : blockers.length
            ? "possible"
            : "likely_property_match",
        confidence: tenure.startsWith("rental") || tenure === "owner-occupied" ? "medium" : "low",
        reasons,
        blockers,
        nextSteps: [
          "Confirm household income ≤ £36k or benefits / eligible postcode route",
          "Check Warmer Homes London / local authority delivery queue for this borough",
          "https://www.gov.uk/apply-warm-homes-local-grant",
          "https://www.london.gov.uk/programmes-strategies/environment-and-climate-change/net-zero-energy/warmer-homes",
        ],
        links: [
          "https://www.gov.uk/apply-warm-homes-local-grant",
          "https://www.london.gov.uk/programmes-strategies/environment-and-climate-change/net-zero-energy/warmer-homes",
        ],
      })
    );
  }

  // ECO4 — property-side band/tenure gate; household eligibility is separate.
  {
    const reasons = [];
    const blockers = [];
    const ownerOk = tenure === "owner-occupied" && bandIn(band, ["D", "E", "F", "G"]);
    const prsOk = tenure === "rental (private)" && bandIn(band, ["E", "F", "G"]);

    if (ownerOk) {
      reasons.push(`Owner-occupied + band ${band} can fit common ECO4 Flex routes (D–G)`);
    } else if (prsOk) {
      reasons.push(`Private rented + band ${band} can fit common ECO4 Flex routes (E–G)`);
    } else if (tenure === "rental (private)" && bandIn(band, ["D"])) {
      blockers.push("Private rented band D is often too high for ECO4 Flex (commonly E–G)");
      reasons.push("May still qualify under other ECO4 routes or local flex rules — verify");
    } else if (tenure === "rental (social)") {
      blockers.push("Social housing usually uses different funding (e.g. Warm Homes: Social Housing Fund), not ECO4 Flex");
    } else if (!bandIn(band, ["D", "E", "F", "G"])) {
      blockers.push(`Band ${band || "unknown"} outside typical ECO4 inefficient-home range`);
    } else {
      blockers.push("Tenure unknown — cannot confirm ECO4 tenure/band pairing");
    }

    reasons.push("ECO4 also needs household eligibility (benefits, LA Flex referral, etc.)");

    let status = "possible";
    if (ownerOk || prsOk) status = "likely_property_match";
    if (blockers.some((b) => b.includes("Social housing") || b.includes("outside typical"))) {
      status = "unlikely";
    }

    schemes.push(
      makeScheme({
        id: "eco4",
        name: "ECO4 / LA Flex",
        status,
        confidence: ownerOk || prsOk ? "medium" : "low",
        reasons,
        blockers,
        nextSteps: [
          "Refer via energy supplier / LA Flex if household qualifies",
          "Confirm measure package after retrofit assessment",
          "https://www.ofgem.gov.uk/environmental-and-social-schemes/energy-company-obligation-eco",
        ],
        links: [
          "https://www.ofgem.gov.uk/environmental-and-social-schemes/energy-company-obligation-eco",
        ],
      })
    );
  }

  // Boiler Upgrade Scheme — heating replacement grant; EPC optional since Apr 2026.
  {
    const reasons = [];
    const blockers = [];

    if (tenure === "rental (social)") {
      blockers.push("Social housing is usually ineligible for BUS");
    } else if (tenure === "unknown") {
      blockers.push("Confirm property is not social housing");
    } else {
      reasons.push(`Tenure ${tenure} is not social housing`);
    }

    if (heating.category === "heat_pump") {
      blockers.push("Existing heat pump indicated — BUS is for replacing eligible current systems");
    } else if (
      heating.category === "mains_gas" ||
      heating.category === "fossil_off_gas" ||
      heating.category === "electric"
    ) {
      reasons.push(`Current heating looks replaceable under BUS (${heating.category})`);
    } else {
      blockers.push("Could not confirm an eligible fossil/electric system from the EPC text");
    }

    reasons.push("BUS no longer requires a valid EPC (from 28 Apr 2026), but RRN helps applications");
    reasons.push("Grant values depend on technology/on-gas vs off-gas (commonly £7,500 ASHP on-gas)");

    const status = blockers.some((b) => b.includes("Social housing") || b.includes("Existing heat pump"))
      ? "unlikely"
      : blockers.length
        ? "possible"
        : "likely_property_match";

    schemes.push(
      makeScheme({
        id: "boiler-upgrade-scheme",
        name: "Boiler Upgrade Scheme",
        status,
        confidence: heating.category === "unknown" ? "low" : "medium",
        reasons,
        blockers,
        nextSteps: [
          "Get MCS installer quote that deducts the BUS grant",
          "https://www.gov.uk/apply-boiler-upgrade-scheme",
        ],
        links: ["https://www.gov.uk/apply-boiler-upgrade-scheme"],
      })
    );
  }

  // Warm Homes: Social Housing Fund — social stock pathway.
  if (tenure === "rental (social)") {
    const reasons = [];
    const blockers = [];
    if (bandIn(band, ["D", "E", "F", "G"])) {
      reasons.push(`Social rented home with band ${band} may fit social housing retrofit programmes`);
    } else if (band) {
      blockers.push(`Band ${band} may already be above typical inefficient-stock targeting`);
    }
    for (const note of localSchemeNotes(council)) {
      if (/Social Housing Fund/i.test(note)) reasons.push(note);
    }
    reasons.push("Delivery is via the landlord / local authority programme, not a resident DIY application");

    schemes.push(
      makeScheme({
        id: "warm-homes-social-housing-fund",
        name: "Warm Homes: Social Housing Fund",
        status: blockers.length ? "possible" : "likely_property_match",
        confidence: "medium",
        reasons,
        blockers,
        nextSteps: [
          "Route via the registered provider / council housing retrofit programme",
        ],
        links: [
          "https://www.gov.uk/government/collections/warm-homes-social-housing-fund",
        ],
      })
    );
  }

  // Private rented MEES pressure — not a grant, but retrofit driver.
  if (tenure === "rental (private)") {
    const reasons = [];
    const blockers = [];
    if (bandIn(band, ["F", "G"])) {
      reasons.push(`Band ${band} is below the PRS MEES floor (E) unless a valid exemption exists`);
    } else if (bandIn(band, ["E"])) {
      reasons.push("Band E meets current MEES minimum but may still need upgrades for future standards / tenant comfort");
    } else if (bandIn(band, ["D"])) {
      reasons.push("Band D currently meets MEES minimum; retrofit may still unlock grants if household-eligible");
    } else {
      blockers.push("Band already above typical MEES concern range");
    }

    schemes.push(
      makeScheme({
        id: "prs-mees",
        name: "Private Rented MEES compliance pressure",
        status: bandIn(band, ["F", "G"])
          ? "action_needed"
          : bandIn(band, ["D", "E"])
            ? "monitor"
            : "unlikely",
        confidence: "medium",
        reasons,
        blockers,
        nextSteps: [
          "Landlords: check exemptions and planned PRS standard changes before letting",
        ],
        links: [
          "https://www.gov.uk/guidance/domestic-private-rented-property-minimum-energy-efficiency-standard-landlord-guidance",
        ],
      })
    );
  }

  // Closed / historical note for operators still asking about GBIS.
  schemes.push(
    makeScheme({
      id: "gbis",
      name: "Great British Insulation Scheme",
      status: "closed",
      confidence: "high",
      reasons: [
        "GBIS closed 31 March 2026; kept here so operators do not pitch an ended scheme",
      ],
      blockers: ["Scheme closed"],
      nextSteps: ["Use Warm Homes: Local Grant / ECO4 pathways instead where eligible"],
      links: [
        "https://www.ofgem.gov.uk/environmental-and-social-schemes/great-british-insulation-scheme",
      ],
    })
  );

  const matchingSchemes = schemes.filter((scheme) =>
    ["likely_property_match", "possible", "action_needed"].includes(scheme.status)
  );

  return {
    band,
    potentialBand,
    sap,
    sapPotential,
    tenure,
    tenureCode,
    propertyType,
    propertyTypeCode,
    heating,
    fabric,
    registrationDate,
    epcAgeYears: ageYears != null ? Number(ageYears.toFixed(2)) : null,
    epcLikelyExpired,
    needsRetrofit,
    priority: needsRetrofit ? priority : "low",
    retrofitSignals,
    improvementSummaries,
    schemes,
    matchingSchemeIds: matchingSchemes.map((scheme) => scheme.id),
    caveats: [
      "EPC register fields support property-side screening only.",
      "Income, benefits, council tax band, and local-authority funding availability are not on the EPC and must be checked separately.",
      "Scheme rules change; treat statuses as leads for verification, not approvals.",
    ],
  };
}
