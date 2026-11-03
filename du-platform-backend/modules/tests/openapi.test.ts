import { describe, expect, it } from "vitest";
import spec from "../../openapi.json";

describe("published API description", () => {
  it("has defined security schemes and required path parameters", () => {
    const schemes = spec.components.securitySchemes as Record<string, unknown>;
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const operation of Object.values(methods) as Array<{security?: Record<string, unknown>[]; parameters?: Array<{in: string; name: string; required: boolean}>}>) {
        for (const security of operation.security ?? [])
          for (const name of Object.keys(security)) expect(schemes, `${path}: ${name}`).toHaveProperty(name);
        for (const match of path.matchAll(/\{([^}]+)\}/g))
          expect(operation.parameters, path).toContainEqual(expect.objectContaining({in: "path", name: match[1], required: true}));
      }
    }
  });
});
