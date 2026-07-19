import type { MobiusConfig } from "../config/mobiusConfig.js";

export type MobiusCin = {
  rn?: string;
  ri?: string;
  con?: string | number | boolean | Record<string, unknown> | Array<unknown>;
};

export type MobiusClient = {
  getLatestCin(containerName: string): Promise<MobiusCin>;
  createCin(containerName: string, content: MobiusCin["con"]): Promise<MobiusCin>;
  discoverCinUris(containerName: string, options?: { offset?: number; limit?: number }): Promise<string[]>;
  getCinByUri(uri: string): Promise<MobiusCin>;
};

type FetchLike = typeof fetch;

function joinUrl(...parts: string[]): string {
  return parts
    .map((part, index) => {
      if (index === 0) return part.replace(/\/+$/, "");
      return part.replace(/^\/+|\/+$/g, "");
    })
    .join("/");
}

function generateCinRn(): string {
  const now = new Date();
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");

  return [
    "4-",
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
    pad(now.getMilliseconds(), 3),
  ].join("");
}

function commonHeaders(config: MobiusConfig): Record<string, string> {
  return {
    Accept: "application/json",
    "X-API-KEY": config.apiKey,
    "X-AUTH-CUSTOM-CREATOR": config.creator,
    "X-AUTH-CUSTOM-LECTURE": config.lecture,
    "X-M2M-Origin": config.origin,
    "X-M2M-RI": config.requestIdentifier,
  };
}

async function parseCinResponse(response: Response): Promise<MobiusCin> {
  const responseBody = (await response.json()) as { "m2m:cin"?: MobiusCin };
  const cin = responseBody["m2m:cin"];

  if (!cin) {
    throw new Error("Mobius response did not include m2m:cin");
  }

  return cin;
}

async function requestCin(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<MobiusCin> {
  const response = await fetchImpl(url, init);

  if (!response.ok) {
    throw new Error(`Mobius request failed with status ${response.status}`);
  }

  return parseCinResponse(response);
}

async function requestUriList(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<string[]> {
  const response = await fetchImpl(url, init);

  if (!response.ok) {
    throw new Error(`Mobius discovery request failed with status ${response.status}`);
  }

  const responseBody = (await response.json()) as { "m2m:uril"?: string[] };

  return responseBody["m2m:uril"] ?? [];
}

export function createMobiusClient(config: MobiusConfig, fetchImpl: FetchLike = fetch): MobiusClient {
  return {
    getLatestCin(containerName) {
      return requestCin(fetchImpl, joinUrl(config.baseUrl, config.aePath, containerName, "la"), {
        method: "GET",
        headers: commonHeaders(config),
      });
    },

    createCin(containerName, content) {
      return requestCin(fetchImpl, joinUrl(config.baseUrl, config.aePath, containerName), {
        method: "POST",
        headers: {
          ...commonHeaders(config),
          "Content-Type": "application/json;ty=4",
        },
        body: JSON.stringify({
          "m2m:cin": {
            rn: generateCinRn(),
            con: content,
          },
        }),
      });
    },

    discoverCinUris(containerName, options = {}) {
      const offset = options.offset ?? 0;
      const limit = options.limit ?? 500;
      const query = new URLSearchParams({
        fu: "1",
        lvl: "1",
        ty: "4",
        ofst: String(offset),
        lim: String(limit),
      });

      return requestUriList(fetchImpl, `${joinUrl(config.baseUrl, config.aePath, containerName)}?${query}`, {
        method: "GET",
        headers: commonHeaders(config),
      });
    },

    getCinByUri(uri) {
      return requestCin(fetchImpl, joinUrl(config.baseUrl, uri), {
        method: "GET",
        headers: commonHeaders(config),
      });
    },
  };
}
