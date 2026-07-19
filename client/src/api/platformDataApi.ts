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

export type PlatformDataDiscoveryResponse = {
  groups: PlatformDataGroup[];
};

export async function fetchBreathConditionGroups(): Promise<PlatformDataDiscoveryResponse> {
  const response = await fetch("/api/platform-data/breath-condition/discovery");

  if (!response.ok) {
    throw new Error(`Failed to discover platform data: ${response.status}`);
  }

  return response.json() as Promise<PlatformDataDiscoveryResponse>;
}

export async function exportBreathConditionCsv(groupKeys: string[]): Promise<Blob> {
  const response = await fetch("/api/platform-data/breath-condition/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupKeys }),
  });

  if (!response.ok) {
    throw new Error(`Failed to export platform data: ${response.status}`);
  }

  return response.blob();
}
