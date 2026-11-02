/**
 * myopendata types.
 *
 * Shapes follow the public Malaysia open data surface: a unified
 * search over datasets and dashboards, a dataset catalogue and a
 * dashboard catalogue addressed by id / name, DOSM datasets,
 * weather and flood warnings, and GTFS transit lookups addressed
 * by provider (with an optional category). HTTP access is described
 * by a minimal response surface so tests can inject a fake fetch
 * and never touch the network.
 */

export interface SearchOptions {
  query: string;
  limit?: number;
}

export interface ListOptions {
  limit?: number;
}

export interface IdOptions {
  id: string;
}

export interface NameOptions {
  name: string;
}

export interface WeatherForecastOptions {
  location?: string;
}

export interface TransitOptions {
  provider: string;
  category?: string;
}

export interface HelloOptions {
  name?: string;
}

/** Minimal HTTP response surface so tests can inject fixtures. */
export interface HttpResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    redirect?: string;
  },
) => Promise<HttpResponse>;
