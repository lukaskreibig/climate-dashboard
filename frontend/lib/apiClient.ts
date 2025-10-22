import type {
  BackendDataResponse,
  ApiErrorPayload,
} from "@/types";
import type { FjordDataBundle } from "@/types";

const JSON_HEADERS: HeadersInit = { accept: "application/json" };

class ApiError extends Error {
  public readonly status: number;
  public readonly payload?: ApiErrorPayload | null;

  constructor(message: string, status: number, payload?: ApiErrorPayload | null) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...init.headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const payload = isJson ? (body as ApiErrorPayload) : null;
    const message =
      payload?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return body as T;
}

export async function fetchBaseData(): Promise<BackendDataResponse> {
  return fetchJson<BackendDataResponse>("/api/data");
}

export async function fetchFjordData(): Promise<
  FjordDataBundle & { seasonLossPct?: number | null }
> {
  return fetchJson<FjordDataBundle & { seasonLossPct?: number | null }>(
    "/api/uummannaq"
  );
}

export { ApiError };
