# Changelog

## 0.1.0 (2026-10-26)

- Initial release.
- CLI: `myopendata search-all|list-datasets|search-datasets|dataset|
  list-dashboards|search-dashboards|dashboard|list-dosm|dosm|
  weather-forecast|weather-warnings|flood-warnings|transport-agencies|
  transit-routes|transit-stops|hello` and `myopendata mcp`.
- MCP server (`myopendata mcp`, stdio) with a labelled core subset of
  16 tools: `search_all`, `list_datasets_catalogue`,
  `search_datasets_catalogue`, `get_dataset_details`, `list_dashboards`,
  `search_dashboards`, `get_dashboard_details`, `list_dosm_datasets`,
  `get_dosm_dataset`, `get_weather_forecast`, `get_weather_warnings`,
  `get_flood_warnings`, `list_transport_agencies`, `get_transit_routes`,
  `get_transit_stops`, and `hello`.
- Calls go to the Malaysia open data API under the base URL from
  `MYOPENDATA_API_URL`, defaulting to `https://api.data.gov.my`; the
  service is keyless.
- HTTP failures surface the status plus the upstream `message` or
  `error` when present.
- All HTTP goes through an injectable fetch function, so the test
  suite runs entirely on hand-written fixtures with no network access.
