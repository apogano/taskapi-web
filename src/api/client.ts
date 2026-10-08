import createClient from "openapi-fetch";
import { getAccessToken, refreshAccessToken } from "./auth";
import type { paths } from "./schema";

function withAuth(request: Request): Request {
  const token = getAccessToken();
  if (!token) return request;
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(request, { headers });
}

async function authFetch(request: Request): Promise<Response> {
  // A request body can only be read once, so keep a copy for a possible retry
  const retry = request.clone();
  const response = await fetch(withAuth(request));

  // On auth endpoints a 401 means wrong credentials, not an expired token
  const isAuthEndpoint = new URL(request.url).pathname.startsWith("/api/auth/");
  if (response.status !== 401 || isAuthEndpoint) {
    return response;
  }

  // Expired access token, or none yet in this tab: refresh once, retry once
  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;
  return fetch(withAuth(retry));
}

export const api = createClient<paths>({ baseUrl: "/api", fetch: authFetch });