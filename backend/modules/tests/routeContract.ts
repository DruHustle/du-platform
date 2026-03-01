export type RouteEntry = {
  path: string;
  methods: string[];
  handlerNames: string[];
};

export function getRouteEntries(router: any): RouteEntry[] {
  const stack = Array.isArray(router?.stack) ? router.stack : [];
  return stack
    .filter((layer: any) => layer?.route)
    .map((layer: any) => {
      const route = layer.route;
      const methods = Object.keys(route?.methods ?? {}).filter((method) => route.methods[method]);
      const handlerNames = Array.isArray(route?.stack)
        ? route.stack.map((handler: any) => String(handler?.name ?? "anonymous"))
        : [];

      return {
        path: String(route?.path ?? ""),
        methods,
        handlerNames,
      };
    });
}

export function findRoute(entries: RouteEntry[], method: string, path: string): RouteEntry | undefined {
  const normalizedMethod = method.toLowerCase();
  return entries.find((entry) => entry.path === path && entry.methods.includes(normalizedMethod));
}

export function getMountedRouterCount(router: any): number {
  const stack = Array.isArray(router?.stack) ? router.stack : [];
  return stack.filter((layer: any) => !layer?.route && layer?.name === "router").length;
}
