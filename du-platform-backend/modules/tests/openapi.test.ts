import { describe, expect, it, vi } from "vitest";
import { createModularServer } from "../../server";
import {
  apiDocument as spec,
  registeredApiOperations,
  resolveApiSchema,
  validateApiSchema,
} from "./apiContract";
import { publishedSourceSchema, schemaSources } from "./openapiSchemaSources";

// Importing the registry must never connect to a developer's configured DB.
vi.mock("../../shared/databaseRuntime", () => ({
  db: null,
  isMemoryFallbackEnabled: () => true,
}));

describe("published API description", () => {
  it("has defined security schemes and required path parameters", () => {
    const schemes = spec.components.securitySchemes as Record<string, unknown>;
    for (const [path, methods] of Object.entries(spec.paths) as Array<
      [string, Record<string, any>]
    >) {
      for (const operation of Object.values(methods) as Array<{
        security?: Record<string, unknown>[];
        parameters?: Array<{ in: string; name: string; required: boolean }>;
      }>) {
        for (const security of operation.security ?? [])
          for (const name of Object.keys(security))
            expect(schemes, `${path}: ${name}`).toHaveProperty(name);
        for (const match of path.matchAll(/\{([^}]+)\}/g))
          expect(operation.parameters, path).toContainEqual(
            expect.objectContaining({
              in: "path",
              name: match[1],
              required: true,
            })
          );
      }
    }
  });

  it("covers the actual system and nested domain routes, without inventing endpoints", () => {
    const app = createModularServer({
      backend: { db: null, serverStartedAt: Date.now() },
    });
    const registered = registeredApiOperations(app);
    const documented = new Set<string>();
    for (const [path, methods] of Object.entries(spec.paths) as Array<
      [string, Record<string, any>]
    >) {
      for (const [method, operation] of Object.entries(methods)) {
        expect(["schema", "route-inventory"]).toContain(
          operation["x-contract-coverage"]
        );
        documented.add(`${method} ${path}`);
      }
    }
    // Express static middleware serves this file path rather than a route layer.
    // Its real GET/cache/404 behavior is covered by productAssets.test.ts.
    documented.delete("get /shop/assets/{file}");
    expect([...registered].sort()).toEqual([...documented].sort());
  });

  it.each(Object.keys(schemaSources))(
    "keeps %s aligned with the backend runtime validator",
    name => {
      expect(resolveApiSchema(spec.components.schemas[name])).toEqual(
        publishedSourceSchema(name)
      );
    }
  );

  it("resolves every schema reference and rejects missing envelope and nested client fields", () => {
    // Resolving the whole document catches dangling refs in requests/responses,
    // not just the subset exercised by successful fixtures.
    expect(() => resolveApiSchema(spec)).not.toThrow();
    const catalogue =
      spec.paths["/shop/products"].get.responses["200"].content[
        "application/json"
      ].schema;
    expect(
      validateApiSchema(catalogue, {
        success: true,
        data: { products: [{}] },
        error: null,
      }).success
    ).toBe(false);
    const error = { $ref: "#/components/schemas/Error" };
    expect(
      validateApiSchema(error, { success: false, error: {} }).success
    ).toBe(false);
    expect(
      validateApiSchema(error, {
        success: false,
        data: null,
        error: { code: "INVALID", message: "Check input." },
      }).success
    ).toBe(true);
    const saved = { $ref: "#/components/schemas/SavedTravelInput" };
    expect(
      validateApiSchema(saved, {
        name: "Missing criteria",
        kind: "search",
        draft: { searches: [], estimates: [] },
      }).success
    ).toBe(false);
    expect(
      validateApiSchema({ $ref: "#/components/schemas/OrderQuoteItem" }, {})
        .success
    ).toBe(false);
  });
});
