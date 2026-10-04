import test from "node:test";
import assert from "node:assert/strict";
import {
  addressKey,
  filterAddresses,
  formatAddress,
  groupByAddress,
  summarizeCertificate,
} from "../src/address.js";

test("formatAddress joins non-empty lines", () => {
  assert.equal(
    formatAddress({
      addressLine1: "Flat 2",
      addressLine2: "56 Genesta Road",
      addressLine3: null,
      addressLine4: "",
    }),
    "Flat 2, 56 Genesta Road"
  );
});

test("groupByAddress keeps newest certificate per UPRN", () => {
  const grouped = groupByAddress([
    {
      uprn: 1,
      addressLine1: "76 Genesta Road",
      postcode: "SE18 3EU",
      postTown: "LONDON",
      council: "Greenwich",
      constituency: "Erith and Thamesmead",
      certificateNumber: "1111-1111-1111-1111-1111",
      currentEnergyEfficiencyBand: "D",
      registrationDate: "2020-01-01",
      schemaType: "RdSAP-Schema-20.0.0",
    },
    {
      uprn: 1,
      addressLine1: "76 Genesta Road",
      postcode: "SE18 3EU",
      postTown: "LONDON",
      council: "Greenwich",
      constituency: "Erith and Thamesmead",
      certificateNumber: "2222-2222-2222-2222-2222",
      currentEnergyEfficiencyBand: "C",
      registrationDate: "2026-03-24",
      schemaType: "RdSAP-Schema-21.0.1",
    },
    {
      uprn: 2,
      addressLine1: "Flat 2",
      addressLine2: "56 Genesta Road",
      postcode: "SE18 3EU",
      postTown: "PLUMSTEAD",
      council: "Greenwich",
      constituency: "Erith and Thamesmead",
      certificateNumber: "3333-3333-3333-3333-3333",
      currentEnergyEfficiencyBand: "C",
      registrationDate: "2026-05-28",
      schemaType: "RdSAP-Schema-21.0.1",
    },
  ]);

  assert.equal(grouped.length, 2);
  const house = grouped.find((entry) => entry.uprn === 1);
  assert.equal(house.newest.certificateNumber, "2222-2222-2222-2222-2222");
  assert.equal(house.newest.currentEnergyEfficiencyBand, "C");
  assert.equal(house.certificateCount, 2);
  assert.equal(house.history[1].certificateNumber, "1111-1111-1111-1111-1111");
});

test("filterAddresses matches partial address text", () => {
  const grouped = groupByAddress([
    {
      uprn: 1,
      addressLine1: "76 Genesta Road",
      postcode: "SE18 3EU",
      certificateNumber: "2222-2222-2222-2222-2222",
      currentEnergyEfficiencyBand: "C",
      registrationDate: "2026-03-24",
    },
    {
      uprn: 2,
      addressLine1: "84 Genesta Road",
      postcode: "SE18 3EU",
      certificateNumber: "4444-4444-4444-4444-4444",
      currentEnergyEfficiencyBand: "D",
      registrationDate: "2025-12-07",
    },
  ]);

  const matched = filterAddresses(grouped, "76 genesta");
  assert.equal(matched.length, 1);
  assert.equal(matched[0].uprn, 1);
  assert.equal(addressKey({ uprn: matched[0].uprn }), "uprn:1");
});

test("summarizeCertificate extracts ratings and maps improvement codes", () => {
  const summary = summarizeCertificate(
    {
      address_line_1: "76 Genesta Road",
      postcode: "SE18 3EU",
      dwelling_type: "Mid-terrace house",
      total_floor_area: 80,
      current_energy_efficiency_band: "C",
      potential_energy_efficiency_band: "B",
      energy_rating_current: 71,
      energy_rating_potential: 84,
      main_heating: [{ description: "Boiler and radiators, mains gas" }],
      suggested_improvements: [
        {
          sequence: 1,
          indicative_cost: "£100 - £350",
          typical_saving: { value: 40, currency: "GBP" },
          improvement_type: "A",
          improvement_details: { improvement_number: 5 },
        },
      ],
    },
    {
      improvement_summary: { "5": "Increase loft insulation to 270 mm" },
      improvement_description: { "5": "Loft insulation laid in the loft space..." },
    }
  );

  assert.equal(summary.currentBand, "C");
  assert.equal(summary.energyRatingCurrent, 71);
  assert.equal(summary.mainHeating[0], "Boiler and radiators, mains gas");
  assert.equal(
    summary.suggestedImprovements[0].summary,
    "Increase loft insulation to 270 mm"
  );
});
