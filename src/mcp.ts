/**
 * myopendata MCP server. Tools (labelled core subset, 16):
 * search_all, list_datasets_catalogue, search_datasets_catalogue,
 * get_dataset_details, list_dashboards, search_dashboards,
 * get_dashboard_details, list_dosm_datasets, get_dosm_dataset,
 * get_weather_forecast, get_weather_warnings, get_flood_warnings,
 * list_transport_agencies, get_transit_routes, get_transit_stops,
 * hello.
 *
 * Why the low-level Server instead of McpServer: the high-level
 * helper converts zod schemas to JSON Schema and injects keys that
 * are not in this tool's public spec ("$schema" and
 * "additionalProperties"), which breaks exact tool-list/schema
 * parity with the spec. This file serves tools/list with the
 * spec's exact input schemas as explicit literals, while zod still
 * validates every tools/call argument set.
 *
 * Keyless. The API base URL is read from MYOPENDATA_API_URL at
 * call time and defaults to https://api.data.gov.my.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
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

const NoArgs = z.object({});
const SearchArgs = z.object({
  query: z.string(),
  limit: z.number().int().optional(),
});
const ListArgs = z.object({ limit: z.number().int().optional() });
const IdArgs = z.object({ id: z.string() });
const NameArgs = z.object({ name: z.string() });
const ForecastArgs = z.object({ location: z.string().optional() });
const TransitArgs = z.object({
  provider: z.string(),
  category: z.string().optional(),
});
const HelloArgs = z.object({ name: z.string().optional() });

const TOOLS = [
  {
    name: "search_all",
    description: "Search datasets and dashboards together for a query.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query text." },
        limit: { type: "integer", description: "Maximum number of results to return." },
      },
      required: ["query"],
    },
  },
  {
    name: "list_datasets_catalogue",
    description: "List datasets in the data catalogue.",
    inputSchema: {
      type: "object" as const,
      properties: { limit: { type: "integer", description: "Maximum number of datasets to return." } },
    },
  },
  {
    name: "search_datasets_catalogue",
    description: "Search the dataset catalogue for a query.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query text." },
        limit: { type: "integer", description: "Maximum number of datasets to return." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_dataset_details",
    description: "Get details for one dataset by its catalogue id.",
    inputSchema: {
      type: "object" as const,
      properties: { id: { type: "string", description: "Dataset catalogue identifier." } },
      required: ["id"],
    },
  },
  {
    name: "list_dashboards",
    description: "List available dashboards.",
    inputSchema: {
      type: "object" as const,
      properties: { limit: { type: "integer", description: "Maximum number of dashboards to return." } },
    },
  },
  {
    name: "search_dashboards",
    description: "Search dashboards for a query.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query text." },
        limit: { type: "integer", description: "Maximum number of dashboards to return." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_dashboard_details",
    description: "Get details for one dashboard by name.",
    inputSchema: {
      type: "object" as const,
      properties: { name: { type: "string", description: "Dashboard name." } },
      required: ["name"],
    },
  },
  {
    name: "list_dosm_datasets",
    description: "List Department of Statistics Malaysia (DOSM) datasets.",
    inputSchema: {
      type: "object" as const,
      properties: { limit: { type: "integer", description: "Maximum number of datasets to return." } },
    },
  },
  {
    name: "get_dosm_dataset",
    description: "Get one DOSM dataset by id.",
    inputSchema: {
      type: "object" as const,
      properties: { id: { type: "string", description: "DOSM dataset identifier." } },
      required: ["id"],
    },
  },
  {
    name: "get_weather_forecast",
    description: "Get the weather forecast, optionally filtered by location.",
    inputSchema: {
      type: "object" as const,
      properties: { location: { type: "string", description: "Location to filter the forecast by." } },
    },
  },
  {
    name: "get_weather_warnings",
    description: "Get current weather warnings.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_flood_warnings",
    description: "Get current flood warnings.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_transport_agencies",
    description: "List transport agencies with GTFS data.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_transit_routes",
    description: "Get transit routes for a GTFS provider, optionally by category.",
    inputSchema: {
      type: "object" as const,
      properties: {
        provider: { type: "string", description: "GTFS provider identifier." },
        category: { type: "string", description: "Transit category to filter by." },
      },
      required: ["provider"],
    },
  },
  {
    name: "get_transit_stops",
    description: "Get transit stops for a GTFS provider, optionally by category.",
    inputSchema: {
      type: "object" as const,
      properties: {
        provider: { type: "string", description: "GTFS provider identifier." },
        category: { type: "string", description: "Transit category to filter by." },
      },
      required: ["provider"],
    },
  },
  {
    name: "hello",
    description: "Return a greeting string. Health-check style tool for connectivity testing.",
    inputSchema: {
      type: "object" as const,
      properties: { name: { type: "string", description: "Name to greet; defaults to World if omitted." } },
    },
  },
];

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  return {
    content: [
      { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
    ],
    isError: true,
  };
}

const server = new Server(
  { name: "myopendata", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const fetchFn = globalThis.fetch as unknown as FetchFn;
  const baseUrl = resolveBaseUrl(process.env[BASE_URL_ENV]);
  try {
    let out: unknown;
    if (name === "search_all") {
      out = await searchAll(fetchFn, baseUrl, SearchArgs.parse(args ?? {}));
    } else if (name === "list_datasets_catalogue") {
      out = await listDatasetsCatalogue(fetchFn, baseUrl, ListArgs.parse(args ?? {}));
    } else if (name === "search_datasets_catalogue") {
      out = await searchDatasetsCatalogue(fetchFn, baseUrl, SearchArgs.parse(args ?? {}));
    } else if (name === "get_dataset_details") {
      out = await getDatasetDetails(fetchFn, baseUrl, IdArgs.parse(args ?? {}));
    } else if (name === "list_dashboards") {
      out = await listDashboards(fetchFn, baseUrl, ListArgs.parse(args ?? {}));
    } else if (name === "search_dashboards") {
      out = await searchDashboards(fetchFn, baseUrl, SearchArgs.parse(args ?? {}));
    } else if (name === "get_dashboard_details") {
      out = await getDashboardDetails(fetchFn, baseUrl, NameArgs.parse(args ?? {}));
    } else if (name === "list_dosm_datasets") {
      out = await listDosmDatasets(fetchFn, baseUrl, ListArgs.parse(args ?? {}));
    } else if (name === "get_dosm_dataset") {
      out = await getDosmDataset(fetchFn, baseUrl, IdArgs.parse(args ?? {}));
    } else if (name === "get_weather_forecast") {
      out = await getWeatherForecast(fetchFn, baseUrl, ForecastArgs.parse(args ?? {}));
    } else if (name === "get_weather_warnings") {
      NoArgs.parse(args ?? {});
      out = await getWeatherWarnings(fetchFn, baseUrl);
    } else if (name === "get_flood_warnings") {
      NoArgs.parse(args ?? {});
      out = await getFloodWarnings(fetchFn, baseUrl);
    } else if (name === "list_transport_agencies") {
      NoArgs.parse(args ?? {});
      out = await listTransportAgencies(fetchFn, baseUrl);
    } else if (name === "get_transit_routes") {
      out = await getTransitRoutes(fetchFn, baseUrl, TransitArgs.parse(args ?? {}));
    } else if (name === "get_transit_stops") {
      out = await getTransitStops(fetchFn, baseUrl, TransitArgs.parse(args ?? {}));
    } else if (name === "hello") {
      out = hello(HelloArgs.parse(args ?? {}));
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return textResult(formatPayload(out));
  } catch (err) {
    if (err instanceof McpError) throw err;
    return errorResult(err);
  }
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main();
