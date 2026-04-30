export type AppRoute = "landing" | "dashboard" | "404";

export function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function resolveAppRoute(pathname: string): AppRoute {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === "/dashboard") {
    return "dashboard";
  }

  if (normalizedPath === "/" || normalizedPath === "") {
    return "landing";
  }

  // Any other path is a 404
  return "404";
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
