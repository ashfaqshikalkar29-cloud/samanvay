import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "AICTE Samanvay External Grievance Coordination API",
      version: "1.0.0",
      description:
        "National grievance coordination RESTful API enabling State Directorates of Technical Education (DTE), Universities, and Central Ministries to ingest and query technical education grievances.",
      contact: {
        name: "AICTE Samanvay Technical Support",
        email: "samanvay-api@aicte-india.org",
        url: "https://aicte-india.org",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "Current Samanvay Environment",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Secret API Key assigned to state governments / ministries (starts with aicte_v1_live_)",
        },
      },
      schemas: {
        ComplaintSummary: {
          type: "object",
          properties: {
            id: { type: "string", example: "C-1001" },
            tracking_id: { type: "string", example: "SMV-2026-001001" },
            institution_id: { type: "string", example: "inst-1" },
            bureau: { type: "string", enum: ["RB", "PGRC"] },
            status: { type: "string", example: "Pending" },
            category: { type: "string", example: "Fee Regulation" },
            channel: { type: "string", example: "web" },
            date_received: { type: "string", format: "date", example: "2026-10-02" },
            assigned_officer: { type: "string", example: "Dr. A. Kulkarni" },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/complaints": {
        get: {
          summary: "List Grievances",
          description: "Retrieve paginated list of complaints matching statutory filters.",
          parameters: [
            { name: "bureau", in: "query", schema: { type: "string", enum: ["RB", "PGRC"] } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": {
              description: "List of complaints retrieved successfully.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      totalCount: { type: "integer" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ComplaintSummary" },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized or missing API Key" },
            "429": { description: "Rate limit exceeded" },
          },
        },
        post: {
          summary: "Docket External Grievance",
          description: "Ingest a new grievance from an external agency or state government.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["institution_id", "category", "description"],
                  properties: {
                    institution_id: { type: "string", example: "inst-1" },
                    category: { type: "string", example: "Fee Regulation" },
                    description: { type: "string", example: "Illegal capitation fee charged..." },
                    external_reference: { type: "string", example: "MAH-DTE-2026-904" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Grievance successfully docketed" },
            "400": { description: "Invalid request payload" },
            "401": { description: "Unauthorized" },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
