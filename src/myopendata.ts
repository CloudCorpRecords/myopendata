/**
 * myopendata core: a labelled core subset (16 of the 32 documented
 * tools) against Malaysia's open data API (data.gov.my).
 *
 *   search_all                GET /search?query=&limit=
 *   list_datasets_catalogue   GET /data-catalogue?limit=
 *   search_datasets_catalogue GET /data-catalogue?search=&limit=
 *   get_dataset_details       GET /data-catalogue/{id}
 *   list_dashboards           GET /dashboards?limit=
 *   search_dashboards         GET /dashboards?search=&limit=
 *   get_dashboard_details     GET /dashboards/{name}
 *   list_dosm_datasets        GET /dosm/datasets?limit=
 *   get_dosm_dataset          GET /dosm/datasets/{id}
 *   get_weather_forecast      GET /weather/forecast?location=
 *   get_weather_warnings      GET /weather/warning
 *   get_flood_warnings        GET /flood/warning
 *   list_transport_agencies   GET /transport/agencies
 *   get_transit_routes        GET /gtfs/routes?provider=&category=
 *   get_transit_stops         GET /gtfs/stops?provider=&category=
 *   hello                     no HTTP; returns a greeting string
 *
 * The upstream documentation (TOOLS.md) names these tools and, for
 * search_all, shows a query/limit example; the remaining argument
 * shapes and the endpoint paths above are documented
 * reconstructions from the public data.gov.my API surface, not a
 * probed original server. The service is keyless: no credential is
 * required or sent. The base URL comes from MYOPENDATA_API_URL and
 * defaults to https://api.data.gov.my. All HTTP goes through an
 * injected FetchFn so everything is testable offline.
 */
import type {
  FetchFn,
  HelloOptions,
  IdOptions,
  ListOptions,
  NameOptions,
  SearchOptions,
  TransitOptions,
  WeatherForecastOptions,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_BASE_URL = "https://api.data.gov.my";

export const BASE_URL_ENV = "MYOPENDATA_API_URL";

/** Resolve the API base URL: env value when non-blank, else default. Trailing slashes are stripped. */
export function resolveBaseUrl(value?: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  const base = v ? v : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}

function requireNonEmpty(value: unknown, field: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new Error(`${field} must be a non-empty string`);
  return v;
}

function optionalText(value: unknown): string | undefined {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v : undefined;
}

function optionalLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error("limit must be a positive integer");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function callApi(
  fetchFn: FetchFn,
  baseUrl: string,
  path: string,
  query?: Record<string, string>,
): Promise<unknown> {
  let url = `${resolveBaseUrl(baseUrl)}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) params.set(k, v);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  let response;
  try {
    response = await fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    throw new Error(
      `Malaysia open data API request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!response.ok) {
    let detail = "";
    try {
      const payload: unknown = await response.json();
      if (isRecord(payload)) {
        if (typeof payload.message === "string" && payload.message) {
          detail = `: ${payload.message}`;
        } else if (typeof payload.error === "string" && payload.error) {
          detail = `: ${payload.error}`;
        }
      }
    } catch {
      // A non-JSON error body still reports its HTTP status below.
    }
    throw new Error(
      `Malaysia open data API request failed: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}${detail}`,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new Error("Malaysia open data API returned a response that was not valid JSON");
  }
}

function limitQuery(options: ListOptions): Record<string, string> | undefined {
  const limit = optionalLimit(options.limit);
  return limit !== undefined ? { limit: String(limit) } : undefined;
}

function searchQuery(options: SearchOptions, key: string): Record<string, string> {
  const query: Record<string, string> = { [key]: requireNonEmpty(options.query, "query") };
  const limit = optionalLimit(options.limit);
  if (limit !== undefined) query.limit = String(limit);
  return query;
}

function transitQuery(options: TransitOptions): Record<string, string> {
  const query: Record<string, string> = {
    provider: requireNonEmpty(options.provider, "provider"),
  };
  const category = optionalText(options.category);
  if (category) query.category = category;
  return query;
}

/** Search datasets and dashboards together for a query. */
export async function searchAll(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: SearchOptions,
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/search", searchQuery(options, "query"));
}

/** List datasets in the data catalogue. */
export async function listDatasetsCatalogue(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: ListOptions = {},
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/data-catalogue", limitQuery(options));
}

/** Search the dataset catalogue for a query. */
export async function searchDatasetsCatalogue(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: SearchOptions,
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/data-catalogue", searchQuery(options, "search"));
}

/** Get details for one dataset by its catalogue id. */
export async function getDatasetDetails(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: IdOptions,
): Promise<unknown> {
  const id = requireNonEmpty(options.id, "id");
  return callApi(fetchFn, resolveBaseUrl(baseUrl), `/data-catalogue/${encodeURIComponent(id)}`);
}

/** List available dashboards. */
export async function listDashboards(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: ListOptions = {},
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/dashboards", limitQuery(options));
}

/** Search dashboards for a query. */
export async function searchDashboards(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: SearchOptions,
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/dashboards", searchQuery(options, "search"));
}

/** Get details for one dashboard by name. */
export async function getDashboardDetails(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: NameOptions,
): Promise<unknown> {
  const name = requireNonEmpty(options.name, "name");
  return callApi(fetchFn, resolveBaseUrl(baseUrl), `/dashboards/${encodeURIComponent(name)}`);
}

/** List Department of Statistics Malaysia (DOSM) datasets. */
export async function listDosmDatasets(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: ListOptions = {},
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/dosm/datasets", limitQuery(options));
}

/** Get one DOSM dataset by id. */
export async function getDosmDataset(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: IdOptions,
): Promise<unknown> {
  const id = requireNonEmpty(options.id, "id");
  return callApi(fetchFn, resolveBaseUrl(baseUrl), `/dosm/datasets/${encodeURIComponent(id)}`);
}

/** Get the weather forecast, optionally filtered by location. */
export async function getWeatherForecast(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: WeatherForecastOptions = {},
): Promise<unknown> {
  const location = optionalText(options.location);
  return callApi(
    fetchFn,
    resolveBaseUrl(baseUrl),
    "/weather/forecast",
    location ? { location } : undefined,
  );
}

/** Get current weather warnings. */
export async function getWeatherWarnings(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/weather/warning");
}

/** Get current flood warnings. */
export async function getFloodWarnings(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/flood/warning");
}

/** List transport agencies with GTFS data. */
export async function listTransportAgencies(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/transport/agencies");
}

/** Get transit routes for a GTFS provider, optionally by category. */
export async function getTransitRoutes(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: TransitOptions,
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/gtfs/routes", transitQuery(options));
}

/** Get transit stops for a GTFS provider, optionally by category. */
export async function getTransitStops(
  fetchFn: FetchFn,
  baseUrl: string | undefined,
  options: TransitOptions,
): Promise<unknown> {
  return callApi(fetchFn, resolveBaseUrl(baseUrl), "/gtfs/stops", transitQuery(options));
}

/** Return a greeting string. Health-check style tool for connectivity testing. */
export function hello(options: HelloOptions = {}): string {
  const name = optionalText(options.name);
  return name ? `Hello, ${name}!` : "Hello, World!";
}

/** Render a payload as the JSON text block MCP clients show. */
export function formatPayload(payload: unknown): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}
