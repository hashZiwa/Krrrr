import type { MobiusCin, MobiusClient } from "../clients/mobiusClient.js";

const discoveryLimit = 500;

export type PlatformDataItem = {
  rn: string;
  uri: string;
};

export type PlatformDataGroup = {
  key: string;
  label: string;
  startAt: string;
  endAt: string;
  count: number;
  items: PlatformDataItem[];
};

export type PlatformDataDiscovery = {
  groups: PlatformDataGroup[];
  itemCount: number;
  nextOffset: number;
  hasMore: boolean;
};

export type PlatformDataDiscoveryOptions = {
  offset?: number;
};

export type PlatformDataExportGroup = {
  label: string;
  items: PlatformDataItem[];
};

export type PlatformDataService = {
  discoverBreathConditionGroups(options?: PlatformDataDiscoveryOptions): Promise<PlatformDataDiscovery>;
  exportBreathConditionCsv(groups: PlatformDataExportGroup[]): Promise<string>;
};

type PlatformDataServiceOptions = {
  breathConditionContainer?: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMeasuredAt(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function parseCinDateFromRn(rn: string): Date | null {
  const match = /^4-(\d{14})/.exec(rn);

  if (!match) return null;

  const value = match[1];
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
    Number(value.slice(8, 10)),
    Number(value.slice(10, 12)),
    Number(value.slice(12, 14)),
  );
}

function getGroupStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(18, 0, 0, 0);

  if (date.getTime() < start.getTime()) {
    start.setDate(start.getDate() - 1);
  }

  return start;
}

function toGroupLabel(start: Date, end: Date): string {
  return `${formatDateKey(start)} 18:00 - ${formatDateKey(end)} 18:00`;
}

function getRnFromUri(uri: string): string | null {
  return uri.split("/").filter(Boolean).at(-1) ?? null;
}

function isValidBreathConditionValue(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= -1 && value <= 60;
  }

  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    return false;
  }

  const parsed = Number(value);

  return parsed >= -1 && parsed <= 60;
}

function csvEscape(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsvRow(group: Pick<PlatformDataExportGroup, "label">, cin: MobiusCin): string {
  const rn = cin.rn ?? "";
  const measuredAt = rn ? formatMeasuredAt(parseCinDateFromRn(rn) ?? new Date(0)) : "";

  return [group.label, rn, measuredAt, cin.con ?? ""].map(csvEscape).join(",");
}

export function createPlatformDataService(
  client: Pick<MobiusClient, "discoverCinUris" | "getCinByUri">,
  options: PlatformDataServiceOptions,
): PlatformDataService {
  async function discoverBreathConditionGroups(
    discoveryOptions: PlatformDataDiscoveryOptions = {},
  ): Promise<PlatformDataDiscovery> {
    if (!options.breathConditionContainer) {
      throw new Error("No Mobius breath condition status container configured");
    }

    const offset = discoveryOptions.offset ?? 0;
    const uris = await client.discoverCinUris(options.breathConditionContainer, { offset, limit: discoveryLimit });
    const groups = new Map<string, PlatformDataGroup>();

    const sortedUris = [...uris].sort((left, right) => (getRnFromUri(right) ?? "").localeCompare(getRnFromUri(left) ?? ""));
    const cins = await Promise.all(sortedUris.map((uri) => client.getCinByUri(uri)));

    for (const [index, cin] of cins.entries()) {
      if (!isValidBreathConditionValue(cin.con)) continue;

      const uri = sortedUris[index];
      const rn = cin.rn ?? getRnFromUri(uri);
      const measuredAt = rn ? parseCinDateFromRn(rn) : null;

      if (!rn || !measuredAt) continue;

      const start = getGroupStart(measuredAt);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const key = formatDateKey(start);
      const existing = groups.get(key);
      const group =
        existing ??
        ({
          key,
          label: toGroupLabel(start, end),
          startAt: formatMeasuredAt(start),
          endAt: formatMeasuredAt(end),
          count: 0,
          items: [],
        } satisfies PlatformDataGroup);

      group.items.push({ rn, uri });
      group.count = group.items.length;
      groups.set(key, group);
    }

    return {
      itemCount: uris.length,
      nextOffset: offset + discoveryLimit,
      hasMore: uris.length === discoveryLimit,
      groups: [...groups.values()]
        .map((group) => ({
          ...group,
          items: [...group.items].sort((left, right) => right.rn.localeCompare(left.rn)),
        }))
        .sort((left, right) => right.key.localeCompare(left.key)),
    };
  }

  return {
    discoverBreathConditionGroups,

    async exportBreathConditionCsv(groups) {
      const rows = ["groupLabel,rn,measuredAt,con"];

      for (const group of groups) {
        for (const item of group.items) {
          const cin = await client.getCinByUri(item.uri);

          if (isValidBreathConditionValue(cin.con)) {
            rows.push(toCsvRow(group, cin));
          }
        }
      }

      return `${rows.join("\n")}\n`;
    },
  };
}
