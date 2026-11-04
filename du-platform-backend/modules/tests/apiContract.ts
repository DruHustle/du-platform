import { expect } from "vitest";
import { z } from "zod";
import document from "../../openapi.json";

export const apiDocument = document as Record<string, any>;

// Zod's JSON Schema reader resolves $defs, whereas OpenAPI uses components.
// Resolve local references first and fail closed on unknown/recursive references.
export function resolveApiSchema(value: any, parents: string[] = []): any {
  if (Array.isArray(value))
    return value.map(item => resolveApiSchema(item, parents));
  if (!value || typeof value !== "object") return value;
  if (value.$ref) {
    const ref = String(value.$ref);
    if (!ref.startsWith("#/components/schemas/") || parents.includes(ref))
      throw new Error(`Unsupported API schema reference: ${ref}`);
    const referenced = ref
      .slice(2)
      .split("/")
      .reduce((node, key) => node?.[key], apiDocument);
    if (!referenced) throw new Error(`Missing API schema reference: ${ref}`);
    const { $ref: _ref, ...siblings } = value;
    return resolveApiSchema({ ...referenced, ...siblings }, [...parents, ref]);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      resolveApiSchema(item, parents),
    ])
  );
}

export function validateApiSchema(schema: any, value: unknown) {
  return z.fromJSONSchema(resolveApiSchema(schema)).safeParse(value);
}

export function expectApiRequest(path: string, method: string, value: unknown) {
  const schema =
    apiDocument.paths[path]?.[method]?.requestBody?.content?.[
      "application/json"
    ]?.schema;
  expect(
    schema,
    `${method.toUpperCase()} ${path} must publish its request body`
  ).toBeDefined();
  const result = validateApiSchema(schema, value);
  expect(
    result.success,
    `${method.toUpperCase()} ${path} request: ${result.error?.message ?? ""}`
  ).toBe(true);
}

export async function expectApiResponse(
  path: string,
  method: string,
  response: Response,
  status: number
) {
  expect(response.status, `${method.toUpperCase()} ${path}`).toBe(status);
  const operation = apiDocument.paths[path]?.[method];
  const schema =
    operation?.responses?.[String(status)]?.content?.["application/json"]
      ?.schema;
  expect(
    schema,
    `${method.toUpperCase()} ${path} must publish its ${status} response`
  ).toBeDefined();
  expect(response.headers.get("content-type")).toContain("application/json");
  const body = await response.json();
  const result = validateApiSchema(schema, body);
  expect(
    result.success,
    `${method.toUpperCase()} ${path} ${status}: ${result.error?.message ?? ""}`
  ).toBe(true);
  return body;
}

// Express 4 stores literal mount paths as anchored regular expressions. Refuse
// dynamic mounts rather than silently losing endpoints when routing changes.
function mountPath(layer: any): string {
  if (layer.regexp.fast_slash) return "";
  const prefix = layer.regexp.source
    .replace(/^\^/, "")
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, "");
  const path = prefix.replace(/\\\//g, "/");
  if (!/^\/[A-Za-z0-9_/-]+$/.test(path))
    throw new Error(`Unsupported router mount: ${layer.regexp}`);
  return path;
}

export function registeredApiOperations(app: any): Set<string> {
  const operations = new Set<string>();
  function walk(stack: any[], prefix: string) {
    for (const layer of stack) {
      if (layer.route) {
        if (typeof layer.route.path !== "string")
          throw new Error("API route must have an explicit path");
        const path = `${prefix}${layer.route.path}`
          .replace(/\/$/, "")
          .replace(/^\/api(?=\/|$)/, "")
          .replace(/:([A-Za-z][A-Za-z0-9_]*)/g, "{$1}");
        for (const method of Object.keys(layer.route.methods)) {
          if (layer.route.methods[method]) operations.add(`${method} ${path}`);
        }
      } else if (layer.name === "router") {
        walk(layer.handle.stack, prefix + mountPath(layer));
      }
    }
  }
  walk(app._router.stack, "");
  return operations;
}
