import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDashboardDetails,
  getDatasetDetails,
  getDosmDataset,
  getFloodWarnings,
  getTransitRoutes,
  getTransitStops,
  getWeatherForecast,
  getWeatherWarnings,
  hello,
  listDashboards,
  listDatasetsCatalogue,
  listDosmDatasets,
  listTransportAgencies,
  resolveBaseUrl,
  searchAll,
  searchDashboards,
  searchDatasetsCatalogue,
} from "../src/myopendata.js";
import type { FetchFn, HttpResponse } from "../src/types.js";

function jsonResponse(body: unknown, status = 200, statusText = "OK"): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: { get: () => "application/json" },
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

interface Captured {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}

function fakeFetch(captured: Captured, body: unknown = {}): FetchFn {
  return async (url: string, init?: { method?: string; headers?: Record<string, string> }) => {
    captured.url = url;
    captured.method = init?.method;
    captured.headers = init?.headers;
    return jsonResponse(body);
  };
}

const BASE = "https://api.data.gov.my";

describe("base URL resolution", () => {
  it("defaults and strips trailing slashes", () => {
    assert.equal(resolveBaseUrl(undefined), BASE);
    assert.equal(resolveBaseUrl("  "), BASE);
    assert.equal(resolveBaseUrl("https://example.test/api/"), "https://example.test/api");
  });
});

describe("search and catalogue", () => {
  it("search_all hits /search with query and limit", async () => {
    const c: Captured = {};
    const out = (await searchAll(fakeFetch(c, { results: [1] }), BASE, { query: "e-payment statistics", limit: 10 })) as Record<string, unknown>;
    assert.deepEqual(out.results, [1]);
    const url = new URL(c.url ?? "");
    assert.equal(url.pathname, "/search");
    assert.equal(url.searchParams.get("query"), "e-payment statistics");
    assert.equal(url.searchParams.get("limit"), "10");
    assert.equal(c.method, "GET");
  });

  it("search_all without a limit sends only the query", async () => {
    const c: Captured = {};
    await searchAll(fakeFetch(c, {}), BASE, { query: "fuel" });
    assert.equal(new URL(c.url ?? "").searchParams.get("limit"), null);
  });

  it("search_all rejects a blank query before any request", async () => {
    let called = false;
    const spy: FetchFn = async () => { called = true; return jsonResponse({}); };
    await assert.rejects(() => searchAll(spy, BASE, { query: "  " }), /query/);
    assert.equal(called, false);
  });

  it("list_datasets_catalogue hits /data-catalogue, with limit when given", async () => {
    const c: Captured = {};
    await listDatasetsCatalogue(fakeFetch(c, []), undefined, {});
    assert.equal(c.url, `${BASE}/data-catalogue`);
    const c2: Captured = {};
    await listDatasetsCatalogue(fakeFetch(c2, []), BASE, { limit: 5 });
    assert.equal(new URL(c2.url ?? "").searchParams.get("limit"), "5");
  });

  it("search_datasets_catalogue uses the search param", async () => {
    const c: Captured = {};
    await searchDatasetsCatalogue(fakeFetch(c, []), BASE, { query: "population" });
    const url = new URL(c.url ?? "");
    assert.equal(url.pathname, "/data-catalogue");
    assert.equal(url.searchParams.get("search"), "population");
  });

  it("get_dataset_details encodes the id in the path", async () => {
    const c: Captured = {};
    await getDatasetDetails(fakeFetch(c, {}), BASE, { id: "population malaysia" });
    assert.equal(new URL(c.url ?? "").pathname, "/data-catalogue/population%20malaysia");
  });

  it("an invalid limit is rejected before any request", async () => {
    let called = false;
    const spy: FetchFn = async () => { called = true; return jsonResponse({}); };
    await assert.rejects(() => listDatasetsCatalogue(spy, BASE, { limit: 0 }), /limit/);
    await assert.rejects(() => listDatasetsCatalogue(spy, BASE, { limit: 1.5 }), /limit/);
    assert.equal(called, false);
  });
});

describe("dashboards and DOSM", () => {
  it("list and search dashboards hit /dashboards", async () => {
    const c: Captured = {};
    await listDashboards(fakeFetch(c, []), BASE, { limit: 3 });
    assert.equal(new URL(c.url ?? "").pathname, "/dashboards");
    assert.equal(new URL(c.url ?? "").searchParams.get("limit"), "3");
    const c2: Captured = {};
    await searchDashboards(fakeFetch(c2, []), BASE, { query: "health" });
    assert.equal(new URL(c2.url ?? "").searchParams.get("search"), "health");
  });

  it("get_dashboard_details addresses the dashboard by name", async () => {
    const c: Captured = {};
    await getDashboardDetails(fakeFetch(c, {}), BASE, { name: "kawasanku" });
    assert.equal(new URL(c.url ?? "").pathname, "/dashboards/kawasanku");
  });

  it("list_dosm_datasets and get_dosm_dataset hit /dosm/datasets", async () => {
    const c: Captured = {};
    await listDosmDatasets(fakeFetch(c, []), BASE, {});
    assert.equal(c.url, `${BASE}/dosm/datasets`);
    const c2: Captured = {};
    await getDosmDataset(fakeFetch(c2, {}), BASE, { id: "population" });
    assert.equal(new URL(c2.url ?? "").pathname, "/dosm/datasets/population");
  });

  it("blank ids and names are rejected", async () => {
    const f = fakeFetch({}, {});
    await assert.rejects(() => getDatasetDetails(f, BASE, { id: "" }), /id/);
    await assert.rejects(() => getDashboardDetails(f, BASE, { name: " " }), /name/);
    await assert.rejects(() => getDosmDataset(f, BASE, { id: "" }), /id/);
  });
});

describe("weather, floods and transport", () => {
  it("weather forecast hits /weather/forecast, location optional", async () => {
    const c: Captured = {};
    await getWeatherForecast(fakeFetch(c, []), BASE, {});
    assert.equal(c.url, `${BASE}/weather/forecast`);
    const c2: Captured = {};
    await getWeatherForecast(fakeFetch(c2, []), BASE, { location: "Kuala Lumpur" });
    assert.equal(new URL(c2.url ?? "").searchParams.get("location"), "Kuala Lumpur");
  });

  it("weather and flood warnings hit their warning paths", async () => {
    const c: Captured = {};
    await getWeatherWarnings(fakeFetch(c, []), BASE);
    assert.equal(c.url, `${BASE}/weather/warning`);
    const c2: Captured = {};
    await getFloodWarnings(fakeFetch(c2, []), BASE);
    assert.equal(c2.url, `${BASE}/flood/warning`);
  });

  it("list_transport_agencies hits /transport/agencies", async () => {
    const c: Captured = {};
    await listTransportAgencies(fakeFetch(c, []), BASE);
    assert.equal(c.url, `${BASE}/transport/agencies`);
  });

  it("transit routes and stops send provider, category when given", async () => {
    const c: Captured = {};
    await getTransitRoutes(fakeFetch(c, []), BASE, { provider: "prasarana", category: "rapid-rail-kl" });
    const url = new URL(c.url ?? "");
    assert.equal(url.pathname, "/gtfs/routes");
    assert.equal(url.searchParams.get("provider"), "prasarana");
    assert.equal(url.searchParams.get("category"), "rapid-rail-kl");
    const c2: Captured = {};
    await getTransitStops(fakeFetch(c2, []), BASE, { provider: "ktmb" });
    const url2 = new URL(c2.url ?? "");
    assert.equal(url2.pathname, "/gtfs/stops");
    assert.equal(url2.searchParams.get("category"), null);
  });

  it("transit lookups reject a blank provider before any request", async () => {
    let called = false;
    const spy: FetchFn = async () => { called = true; return jsonResponse({}); };
    await assert.rejects(() => getTransitRoutes(spy, BASE, { provider: "" }), /provider/);
    await assert.rejects(() => getTransitStops(spy, BASE, { provider: " " }), /provider/);
    assert.equal(called, false);
  });
});

describe("hello", () => {
  it("greets by name and falls back to World", () => {
    assert.equal(hello({ name: "Ada" }), "Hello, Ada!");
    assert.equal(hello({}), "Hello, World!");
    assert.equal(hello({ name: "  " }), "Hello, World!");
  });
});

describe("errors", () => {
  it("HTTP 404 surfaces status and upstream message", async () => {
    const failing: FetchFn = async () => jsonResponse({ message: "not found" }, 404, "Not Found");
    await assert.rejects(() => listTransportAgencies(failing, BASE), /HTTP 404.*not found/);
  });

  it("network failure is wrapped with context", async () => {
    const failing: FetchFn = async () => { throw new Error("socket hang up"); };
    await assert.rejects(
      () => listTransportAgencies(failing, BASE),
      /Malaysia open data API request failed: socket hang up/,
    );
  });

  it("honours a custom base URL from the caller", async () => {
    const c: Captured = {};
    await getWeatherWarnings(fakeFetch(c, []), "https://example.test/api/");
    assert.equal(c.url, "https://example.test/api/weather/warning");
  });
});
