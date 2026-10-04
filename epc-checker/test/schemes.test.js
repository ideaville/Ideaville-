import test from "node:test";
import assert from "node:assert/strict";
import {
  assessRetrofitOpportunity,
  detectHeatingCategory,
  localSchemeNotes,
} from "../src/schemes.js";

test("detectHeatingCategory recognises mains gas", () => {
  const result = detectHeatingCategory({
    main_heating: [{ description: "Boiler and radiators, mains gas" }],
    sap_energy_source: { mains_gas: "Y" },
  });
  assert.equal(result.category, "mains_gas");
});

test("owner-occupied band D matches Warm Homes and ECO4 property gates", () => {
  const assessment = assessRetrofitOpportunity({
    council: "Greenwich",
    searchNewest: {
      currentEnergyEfficiencyBand: "D",
      registrationDate: "2020-01-01",
    },
    summary: {
      currentBand: "D",
      potentialBand: "B",
      energyRatingCurrent: 55,
      energyRatingPotential: 81,
      suggestedImprovements: [
        { summary: "50 mm internal or external wall insulation" },
      ],
    },
    cert: {
      tenure: 1,
      property_type: 0,
      current_energy_efficiency_band: "D",
      potential_energy_efficiency_band: "B",
      energy_rating_current: 55,
      energy_rating_potential: 81,
      main_heating: [{ description: "Boiler and radiators, mains gas" }],
      walls: [{ description: "Solid brick, as built, no insulation (assumed)" }],
      suggested_improvements: [
        { improvement_details: { improvement_number: 7 } },
      ],
    },
  });

  assert.equal(assessment.needsRetrofit, true);
  assert.equal(assessment.priority, "medium");
  assert.equal(assessment.tenure, "owner-occupied");

  const wh = assessment.schemes.find((s) => s.id === "warm-homes-local-grant");
  assert.equal(wh.status, "likely_property_match");
  assert.ok(wh.reasons.some((r) => /Greenwich/i.test(r)));

  const eco = assessment.schemes.find((s) => s.id === "eco4");
  assert.equal(eco.status, "likely_property_match");

  const bus = assessment.schemes.find((s) => s.id === "boiler-upgrade-scheme");
  assert.equal(bus.status, "likely_property_match");

  const gbis = assessment.schemes.find((s) => s.id === "gbis");
  assert.equal(gbis.status, "closed");
});

test("social rented homes map to Warm Homes Social Housing Fund instead of WH:LG", () => {
  const assessment = assessRetrofitOpportunity({
    council: "Greenwich",
    summary: {
      currentBand: "D",
      potentialBand: "B",
      energyRatingCurrent: 65,
      energyRatingPotential: 83,
      suggestedImprovements: [],
    },
    cert: {
      tenure: 2,
      property_type: 0,
      main_heating: [{ description: "Boiler and radiators, mains gas" }],
    },
  });

  const wh = assessment.schemes.find((s) => s.id === "warm-homes-local-grant");
  assert.equal(wh.status, "unlikely");
  const social = assessment.schemes.find(
    (s) => s.id === "warm-homes-social-housing-fund"
  );
  assert.equal(social.status, "likely_property_match");
});

test("private rented band D is weaker for ECO4 but still Warm Homes property match", () => {
  const assessment = assessRetrofitOpportunity({
    summary: {
      currentBand: "D",
      potentialBand: "C",
      energyRatingCurrent: 60,
      energyRatingPotential: 72,
      suggestedImprovements: [],
    },
    cert: {
      tenure: 3,
      property_type: 2,
      main_heating: [{ description: "Boiler and radiators, mains gas" }],
    },
  });

  const wh = assessment.schemes.find((s) => s.id === "warm-homes-local-grant");
  assert.equal(wh.status, "likely_property_match");

  const eco = assessment.schemes.find((s) => s.id === "eco4");
  assert.ok(["possible", "unlikely"].includes(eco.status));

  const mees = assessment.schemes.find((s) => s.id === "prs-mees");
  assert.ok(mees);
});

test("band C is not treated as retrofit/grant target for Warm Homes", () => {
  const assessment = assessRetrofitOpportunity({
    summary: {
      currentBand: "C",
      potentialBand: "B",
      energyRatingCurrent: 72,
      energyRatingPotential: 81,
      suggestedImprovements: [],
    },
    cert: {
      tenure: 1,
      main_heating: [{ description: "Boiler and radiators, mains gas" }],
    },
  });

  assert.equal(assessment.needsRetrofit, false);
  const wh = assessment.schemes.find((s) => s.id === "warm-homes-local-grant");
  assert.equal(wh.status, "unlikely");
});

test("localSchemeNotes mentions Greenwich consortium", () => {
  const notes = localSchemeNotes("Greenwich");
  assert.ok(notes.some((note) => /GLA Warm Homes/i.test(note)));
});
