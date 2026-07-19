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
};

export type PlatformDataService = {
  discoverBreathConditionGroups(): Promise<PlatformDataDiscovery>;
  exportBreathConditionCsv(groupKeys: string[]): Promise<string>;
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

function csvEscape(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsvRow(group: PlatformDataGroup, cin: MobiusCin): string {
  const rn = cin.rn ?? "";
  const measuredAt = rn ? formatMeasuredAt(parseCinDateFromRn(rn) ?? new Date(0)) : "";

  return [group.label, rn, measuredAt, cin.con ?? ""].map(csvEscape).join(",");
}

export function createPlatformDataService(
  client: Pick<MobiusClient, "discoverCinUris" | "getCinByUri">,
  options: PlatformDataServiceOptions,
): PlatformDataService {
  async function discoverBreathConditionGroups(): Promise<PlatformDataDiscovery> {
    if (!options.breathConditionContainer) {
      throw new Error("No Mobius breath condition status container configured");
    }

    const uris = await client.discoverCinUris(options.breathConditionContainer, { offset: 0, limit: discoveryLimit });
    const groups = new Map<string, PlatformDataGroup>();

    for (const uri of uris) {
      const rn = getRnFromUri(uri);
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
      groups: [...groups.values()]
        .map((group) => ({
          ...group,
          items: [...group.items].sort((left, right) => left.rn.localeCompare(right.rn)),
        }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    };
  }

  return {
    discoverBreathConditionGroups,

    async exportBreathConditionCsv(groupKeys) {
      const selectedKeys = new Set(groupKeys);
      const { groups } = await discoverBreathConditionGroups();
      const selectedGroups = groups.filter((group) => selectedKeys.has(group.key));
      const rows = ["groupLabel,rn,measuredAt,con"];

      for (const group of selectedGroups) {
        for (const item of group.items) {
          rows.push(toCsvRow(group, await client.getCinByUri(item.uri)));
        }
      }

      return `${rows.join("\n")}\n`;
    },
  };
}
