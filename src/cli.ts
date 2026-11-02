#!/usr/bin/env node
/**
 * myopendata CLI.
 *
 *   myopendata search-all <query> [--limit N]
 *   myopendata list-datasets [--limit N]
 *   myopendata search-datasets <query> [--limit N]
 *   myopendata dataset <id>
 *   myopendata list-dashboards [--limit N]
 *   myopendata search-dashboards <query> [--limit N]
 *   myopendata dashboard <name>
 *   myopendata list-dosm [--limit N]
 *   myopendata dosm <id>
 *   myopendata weather-forecast [--location X]
 *   myopendata weather-warnings
 *   myopendata flood-warnings
 *   myopendata transport-agencies
 *   myopendata transit-routes <provider> [--category X]
 *   myopendata transit-stops <provider> [--category X]
 *   myopendata hello [name]
 *   myopendata mcp
 *
 * Keyless. Base URL from MYOPENDATA_API_URL, default
 * https://api.data.gov.my.
 * Exit codes: 0 success, 1 API error, 2 usage error.
 */
import {
  BASE_URL_ENV,
  formatPayload,
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
  VERSION,
} from "./myopendata.js";
import type { FetchFn } from "./types.js";

function usage(): never {
  console.error(`Usage:
  myopendata search-all <query> [--limit N]
  myopendata list-datasets [--limit N]
  myopendata search-datasets <query> [--limit N]
  myopendata dataset <id>
  myopendata list-dashboards [--limit N]
  myopendata search-dashboards <query> [--limit N]
  myopendata dashboard <name>
  myopendata list-dosm [--limit N]
  myopendata dosm <id>
  myopendata weather-forecast [--location X]
  myopendata weather-warnings
  myopendata flood-warnings
  myopendata transport-agencies
  myopendata transit-routes <provider> [--category X]
  myopendata transit-stops <provider> [--category X]
  myopendata hello [name]
  myopendata mcp
  myopendata --version`);
  process.exit(2);
}

function flag(rest: string[], name: string): string | undefined {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
}

function limitFlag(rest: string[]): number | undefined {
  const raw = flag(rest, "--limit");
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) usage();
  return n;
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") {
    console.log(VERSION);
    return;
  }
  if (cmd === "mcp") {
    await import("./mcp.js");
    return;
  }
  if (!cmd) usage();
  const fetchFn = globalThis.fetch as unknown as FetchFn;
  const baseUrl = resolveBaseUrl(process.env[BASE_URL_ENV]);
  const known = [
    "search-all", "list-datasets", "search-datasets", "dataset",
    "list-dashboards", "search-dashboards", "dashboard",
    "list-dosm", "dosm", "weather-forecast", "weather-warnings",
    "flood-warnings", "transport-agencies", "transit-routes",
    "transit-stops", "hello",
  ];
  if (!known.includes(cmd)) usage();
  try {
    let out: unknown;
    if (cmd === "search-all") {
      if (!rest[0]) usage();
      out = await searchAll(fetchFn, baseUrl, { query: rest[0], limit: limitFlag(rest) });
    } else if (cmd === "list-datasets") {
      out = await listDatasetsCatalogue(fetchFn, baseUrl, { limit: limitFlag(rest) });
    } else if (cmd === "search-datasets") {
      if (!rest[0]) usage();
      out = await searchDatasetsCatalogue(fetchFn, baseUrl, { query: rest[0], limit: limitFlag(rest) });
    } else if (cmd === "dataset") {
      if (!rest[0]) usage();
      out = await getDatasetDetails(fetchFn, baseUrl, { id: rest[0] });
    } else if (cmd === "list-dashboards") {
      out = await listDashboards(fetchFn, baseUrl, { limit: limitFlag(rest) });
    } else if (cmd === "search-dashboards") {
      if (!rest[0]) usage();
      out = await searchDashboards(fetchFn, baseUrl, { query: rest[0], limit: limitFlag(rest) });
    } else if (cmd === "dashboard") {
      if (!rest[0]) usage();
      out = await getDashboardDetails(fetchFn, baseUrl, { name: rest[0] });
    } else if (cmd === "list-dosm") {
      out = await listDosmDatasets(fetchFn, baseUrl, { limit: limitFlag(rest) });
    } else if (cmd === "dosm") {
      if (!rest[0]) usage();
      out = await getDosmDataset(fetchFn, baseUrl, { id: rest[0] });
    } else if (cmd === "weather-forecast") {
      out = await getWeatherForecast(fetchFn, baseUrl, { location: flag(rest, "--location") });
    } else if (cmd === "weather-warnings") {
      out = await getWeatherWarnings(fetchFn, baseUrl);
    } else if (cmd === "flood-warnings") {
      out = await getFloodWarnings(fetchFn, baseUrl);
    } else if (cmd === "transport-agencies") {
      out = await listTransportAgencies(fetchFn, baseUrl);
    } else if (cmd === "transit-routes") {
      if (!rest[0]) usage();
      out = await getTransitRoutes(fetchFn, baseUrl, { provider: rest[0], category: flag(rest, "--category") });
    } else if (cmd === "transit-stops") {
      if (!rest[0]) usage();
      out = await getTransitStops(fetchFn, baseUrl, { provider: rest[0], category: flag(rest, "--category") });
    } else {
      out = hello({ name: rest[0] });
    }
    console.log(formatPayload(out));
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

void main();
