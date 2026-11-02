# myopendata

myopendata reads Malaysia's open data: a unified search across the
dataset catalogue and dashboards, dataset and dashboard details,
Department of Statistics Malaysia (DOSM) datasets, weather forecasts
and warnings, flood warnings, and GTFS transit routes and stops.
One binary serves a command-line interface and a stdio MCP server.

This is a clean-room rebuild covering a labelled core subset of the
documented tools (16 of 32); parquet, raw GTFS parsing, arrivals and
location-search tools are not included. It is not an official
Government of Malaysia server.

No API key is needed. The service is keyless, so myopendata works
with nothing configured. The API base URL can be overridden with
`MYOPENDATA_API_URL`; when it is not set, calls go to
`https://api.data.gov.my`.

## Install

```bash
npx @reneturcios/myopendata list-datasets
```

Or run the container image:

```bash
docker run -i ghcr.io/cloudcorprecords/myopendata
```

The container defaults to the MCP server (see below). Pass CLI
arguments to use it as a CLI instead.

## CLI

```bash
myopendata search-all "e-payment statistics" --limit 10
myopendata list-datasets --limit 5
myopendata search-datasets population
myopendata dataset population_malaysia
myopendata list-dashboards
myopendata search-dashboards health
myopendata dashboard kawasanku
myopendata list-dosm
myopendata dosm population
myopendata weather-forecast --location "Kuala Lumpur"
myopendata weather-warnings
myopendata flood-warnings
myopendata transport-agencies
myopendata transit-routes prasarana --category rapid-rail-kl
myopendata transit-stops ktmb
myopendata hello Ada

myopendata --version
```

Commands print the upstream JSON payload; `hello` prints a greeting
string. Exit codes: `0` on success, `1` when a call fails (including
an upstream API error), `2` for usage errors.

## MCP server

One bin serves both faces. The `mcp` subcommand starts a stdio MCP
server:

```bash
npx -y @reneturcios/myopendata mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "myopendata": {
      "command": "npx",
      "args": ["-y", "@reneturcios/myopendata", "mcp"]
    }
  }
}
```

To point the server at a different compatible host, add
`MYOPENDATA_API_URL` to the client's `env` for this server.

### Tools

| Tool | Input | What it returns |
| --- | --- | --- |
| `search_all` | `query` (required), `limit` (optional) | Unified search results across datasets and dashboards. |
| `list_datasets_catalogue` | `limit` (optional) | Datasets in the data catalogue. |
| `search_datasets_catalogue` | `query` (required), `limit` (optional) | Catalogue datasets matching the query. |
| `get_dataset_details` | `id` (required) | Details for one dataset. |
| `list_dashboards` | `limit` (optional) | Available dashboards. |
| `search_dashboards` | `query` (required), `limit` (optional) | Dashboards matching the query. |
| `get_dashboard_details` | `name` (required) | Details for one dashboard. |
| `list_dosm_datasets` | `limit` (optional) | DOSM datasets. |
| `get_dosm_dataset` | `id` (required) | One DOSM dataset. |
| `get_weather_forecast` | `location` (optional) | The weather forecast payload. |
| `get_weather_warnings` | (none) | Current weather warnings. |
| `get_flood_warnings` | (none) | Current flood warnings. |
| `list_transport_agencies` | (none) | Transport agencies with GTFS data. |
| `get_transit_routes` | `provider` (required), `category` (optional) | Transit routes for a GTFS provider. |
| `get_transit_stops` | `provider` (required), `category` (optional) | Transit stops for a GTFS provider. |
| `hello` | `name` (optional) | A greeting string. Health-check style tool for connectivity testing. |

Known GTFS providers in the upstream documentation include
`mybas-johor`, `ktmb`, and `prasarana`; common names are a feature of
the original server and are not normalised by this rebuild — pass
the provider id directly.

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # node test runner over test/*.test.ts, no network (fake fetch fixtures)
npm run dev     # run the CLI from source via tsx
```

## License

MIT — see `LICENSE`.
