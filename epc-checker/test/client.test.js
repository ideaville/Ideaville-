import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "../src/client.js";

test("searchDomestic builds council and page_size query params", async () => {
  const calls = [];
  const client = createClient({
    token: "test-token",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          data: [],
          pagination: {
            totalRecords: 0,
            currentPage: 1,
            totalPages: 0,
            nextPage: null,
            prevPage: null,
            pageSize: 10,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    },
  });

  await client.searchDomestic({
    "council[]": ["Greenwich"],
    page_size: 10,
    current_page: 1,
  });

  assert.equal(calls.length, 1);
  const requested = new URL(calls[0].url);
  assert.equal(requested.pathname, "/api/domestic/search");
  assert.equal(requested.searchParams.get("council[]"), "Greenwich");
  assert.equal(requested.searchParams.get("page_size"), "10");
  assert.equal(requested.searchParams.get("current_page"), "1");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-token");
});
