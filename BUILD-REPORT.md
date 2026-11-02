# myopendata — Build Report

MCP Rebuild 1000, Tranche #101+ Batch 5. Clean-room rebuild of
hithereiamaliff/mcp-datagovmy (rank 169, 3 stars), built from the
public README tool overview and TOOLS.md captured in
`harness/fixtures/mcp-datagovmy-tools-original.json`. That fixture
is docs-derived and labelled a LABELLED CORE SUBSET: 16 of the
documented tools are built; the argument schemas use TOOLS.md
parameters where given (search_all's query/limit example) and are
documented reconstructions elsewhere — no original server was
probed. Parity proves the rebuild matches this program's defined
spec, labelled docs-derived. Local build only — nothing pushed or
published.

Identity: repo `myopendata`, npm `@reneturcios/myopendata`,
MCP name `io.github.CloudCorpRecords/myopendata`, version `0.1.0`.

## Files created (19/19 per TEMPLATE.md checklist)

- `package.json` — bin `myopendata: dist/cli.js`, `mcpName` set,
  scripts build=`tsc` / dev=`tsx src/cli.ts` / test=`tsx --test test/*.test.ts`
- `server.json` — description "Malaysia open data: datasets,
  dashboards, DOSM, weather, floods and transit, keyless." = **85 chars**
  (≤100 ✓); npm entry carries `version: 0.1.0`; OCI entry
  `ghcr.io/cloudcorprecords/myopendata:0.1.0` carries **no**
  `version` field (verified programmatically)
- `Dockerfile` — node:20-alpine two-stage, ENTRYPOINT
  `node /app/dist/cli.js`, CMD `mcp`, label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/myopendata"`
- `tsconfig.json` (identical to the fleet template), `.gitignore`,
  `LICENSE` (MIT, Copyright (c) 2026 Rene Turcios), `README.md`
  (fresh text), `CHANGELOG.md` (single 0.1.0 entry, 2026-10-26)
- `src/index.ts`, `src/cli.ts` (`search-all`, `list-datasets`,
  `search-datasets`, `dataset`, `list-dashboards`,
  `search-dashboards`, `dashboard`, `list-dosm`, `dosm`,
  `weather-forecast`, `weather-warnings`, `flood-warnings`,
  `transport-agencies`, `transit-routes`, `transit-stops`, `hello`,
  `mcp`, `--version`; exit 2 usage / 1 API error), `src/mcp.ts`,
  `src/types.ts`, `src/myopendata.ts` (core logic, `VERSION = "0.1.0"`)
- `test/myopendata.test.ts`
- `.github/workflows/{ci,publish,publish-container,registry-publish}.yml`
  (from the fleet template; image name and smoke-test server name
  changed to myopendata)

## Tools implemented (16, labelled core subset)

`search_all`, `list_datasets_catalogue`,
`search_datasets_catalogue`, `get_dataset_details`,
`list_dashboards`, `search_dashboards`, `get_dashboard_details`,
`list_dosm_datasets`, `get_dosm_dataset`, `get_weather_forecast`,
`get_weather_warnings`, `get_flood_warnings`,
`list_transport_agencies`, `get_transit_routes`,
`get_transit_stops`, `hello` — as recorded in the fixture
`_source`.

Omitted documented tools (15, listed in the fixture `_source`):
`filter_datasets_catalogue`, `get_dataset_filters`,
`get_dashboard_charts`, `parse_parquet_file`, `get_parquet_info`,
`find_dashboard_for_parquet`, `get_earthquake_warnings`,
`get_transport_data`, `get_gtfs_static`,
`get_gtfs_realtime_vehicle_position`, `parse_gtfs_static`,
`parse_gtfs_realtime`, `get_transit_arrivals`,
`search_transit_stops_by_location`, `find_nearest_transit_stops`.

## Implementation notes

- `src/mcp.ts` uses the SDK's low-level `Server` with explicit
  inputSchema literals, per the standing fleet rule: `McpServer`'s
  zod-to-JSON-Schema conversion injects `$schema` /
  `additionalProperties` keys that are absent from the defined spec
  and break exact schema parity. Zod still validates every
  `tools/call`.
- Endpoints under the base URL (env `MYOPENDATA_API_URL`, default
  `https://api.data.gov.my`, trailing slashes stripped):
  `GET /search?query=&limit=`; `GET /data-catalogue` (list, with
  `?search=&limit=` for search) and `GET /data-catalogue/{id}`;
  `GET /dashboards` (list, with `?search=&limit=` for search) and
  `GET /dashboards/{name}`; `GET /dosm/datasets` and
  `GET /dosm/datasets/{id}`; `GET /weather/forecast` (optional
  `location` param); `GET /weather/warning`; `GET /flood/warning`;
  `GET /transport/agencies`; `GET /gtfs/routes` and
  `GET /gtfs/stops`, both with `provider` (required) and optional
  `category` params. These paths are documented reconstructions
  from the public data.gov.my API surface (see Gaps).
- Keyless by design: no credential is required, read, or sent.
- Validation happens before any request: search queries, ids,
  names and providers must be non-blank strings, and `limit`,
  when supplied, must be a positive integer.
- `hello` performs no HTTP: it returns `Hello, {name}!`, or
  `Hello, World!` when no (non-blank) name is given — TOOLS.md
  describes it as a health-check style tool for connectivity
  testing; the greeting shape is a documented reconstruction.
- HTTP failures surface the status plus the upstream `message` or
  `error` string when present.
- All HTTP flows through an injectable `FetchFn` (types.ts). The
  test suite uses a fake fetch returning hand-written fixtures;
  no live call is made in tests.

## Verification (foreground, exact outputs)

### 1. Build
```
$ ./node_modules/.bin/tsc ; echo exit=$?
tsc exit=0
```
`dist/` produced, including `dist/cli.js`.

### 2. Tests
```
$ ./node_modules/.bin/tsx --test test/*.test.ts
ℹ tests 21
ℹ pass 21
ℹ fail 0
```
Covers: base-URL default/custom/trailing-slash handling;
search_all path with query+limit and query-only; blank query
rejected before any request; catalogue list/search/details paths
(including id URL-encoding); invalid limit (0 and 1.5) rejected
before any request; dashboard list/search/details-by-name; DOSM
list/details; weather forecast with and without location; weather
and flood warning paths; transport agencies path; transit
routes/stops provider+category composition; blank provider
rejected before any request; hello by name and fallback; HTTP 404
surfacing the upstream message; network failure wrapping.

### 3. CLI / MCP smoke
`--version` → `0.1.0` (exit 0); unknown command and no command
exit 2 with Usage; `hello Ada` → `Hello, Ada!` (exit 0). MCP
`initialize` over stdio → `serverInfo: {"name":"myopendata","version":"0.1.0"}`;
a stdio `tools/call` for `hello` with `{name:"Ada"}` returned the
text `Hello, Ada!`. No live data.gov.my call was made in smoke —
the hello path needs no network, and no live result is claimed.

### 4. Parity (harness, from ~/workspace/mcp-rebuild-100/harness/)
```
$ python3 parity.py --original fixtures/mcp-datagovmy-tools-original.json \
    --rebuild "stdio:node .../builds/myopendata/dist/cli.js mcp" \
    --out .../builds/myopendata/parity-out
verdict=PASS parity_pct=100.0 original_tools=16 rebuild_tools=16 missing=[] extra=[] schema_diffs=[]
(exit 0)
```
(parity.json: identical_tools 16/16. The first parity attempt
failed on a transient VM write EPERM while writing parity.json;
the identical re-run passed — recorded here for honesty.)
Original side is tools-file mode, so `fixture_results` records
`SKIPPED-TOOLS-FILE-MODE` — expected harness semantics, not an
error.

## Lockfile status

`package-lock.json` was generated clean via Route 3: a temp copy
holding only `package.json` (no `node_modules`), offline
`npm install --package-lock-only --ignore-scripts`, verified after
generation — parses as JSON, top-level `name` is
`@reneturcios/myopendata`, version `0.1.0`, `lockfileVersion` 3,
128 package entries — then only the lockfile was copied back (and
re-verified after the copy). Local `node_modules` is a sibling
copy (fxrates) used only for the local build/test; it is not part
of the lockfile generation.

## Gaps / honest notes

- Docs-derived spec, labelled core subset: only `search_all`'s
  query/limit shape is documented in TOOLS.md (with an example);
  every other tool's argument schema, and all endpoint paths, are
  documented reconstructions from the public data.gov.my API
  surface — no original mcp-datagovmy server was probed, so parity
  proves the rebuild matches this program's defined spec, not a
  hand-probed original.
- Subset, not full parity: 15 documented tools are omitted (listed
  above and in the fixture `_source`), including all parquet and
  raw GTFS parsing tools and the location-based transit search.
- Behavioural differences from the original are expected: the
  original serves catalogue/dashboard metadata from pre-generated
  static indexes (per its PROMPT.md) and normalises common GTFS
  provider names (e.g. "rapid penang" → prasarana); this rebuild
  issues plain API GETs under the base URL and takes provider ids
  verbatim. Neither behaviour is live-verified.
- No live call was made: every endpoint is fake-fetch tested only,
  so live payload/response-shape drift against api.data.gov.my is
  unverified until the publish wave.
- Container build not exercised locally; the publish-container
  workflow smoke-tests the image at publish time.
