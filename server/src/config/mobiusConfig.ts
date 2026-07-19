export type MobiusConfig = {
  baseUrl: string;
  aePath: string;
  requestIdentifier: string;
  origin: string;
  apiKey: string;
  creator: string;
  lecture: string;
  statusContainers: Record<string, string>;
  uploadContainers: Record<string, string>;
};

const requiredKeys = [
  "MOBIUS_BASE_URL",
  "MOBIUS_AE_PATH",
  "MOBIUS_X_M2M_RI",
  "MOBIUS_X_M2M_ORIGIN",
  "MOBIUS_API_KEY",
  "MOBIUS_AUTH_CUSTOM_CREATOR",
  "MOBIUS_AUTH_CUSTOM_LECTURE",
] as const;

function hasAnyMobiusValue(source: NodeJS.ProcessEnv): boolean {
  return Object.keys(source).some((key) => key.startsWith("MOBIUS_"));
}

function requireValue(source: NodeJS.ProcessEnv, key: (typeof requiredKeys)[number]): string {
  const value = source[key];

  if (!value) {
    throw new Error(`Missing Mobius environment variables: ${key}`);
  }

  return value;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function toCamelCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

function getUploadContainers(source: NodeJS.ProcessEnv): Record<string, string> {
  return getContainersByPrefix(source, "MOBIUS_UPLOAD_CONTAINER_");
}

function getStatusContainers(source: NodeJS.ProcessEnv): Record<string, string> {
  return getContainersByPrefix(source, "MOBIUS_STATUS_CONTAINER_");
}

function getContainersByPrefix(source: NodeJS.ProcessEnv, prefix: string): Record<string, string> {
  return Object.entries(source)
    .filter(([key, value]) => key.startsWith(prefix) && Boolean(value))
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce<Record<string, string>>((containers, [key, value]) => {
      const featureName = key.replace(prefix, "");
      containers[toCamelCase(featureName)] = value as string;
      return containers;
    }, {});
}

export function getMobiusConfig(source: NodeJS.ProcessEnv = process.env): MobiusConfig | null {
  if (!hasAnyMobiusValue(source)) {
    return null;
  }

  return {
    baseUrl: normalizeBaseUrl(requireValue(source, "MOBIUS_BASE_URL")),
    aePath: requireValue(source, "MOBIUS_AE_PATH"),
    requestIdentifier: requireValue(source, "MOBIUS_X_M2M_RI"),
    origin: requireValue(source, "MOBIUS_X_M2M_ORIGIN"),
    apiKey: requireValue(source, "MOBIUS_API_KEY"),
    creator: requireValue(source, "MOBIUS_AUTH_CUSTOM_CREATOR"),
    lecture: requireValue(source, "MOBIUS_AUTH_CUSTOM_LECTURE"),
    statusContainers: getStatusContainers(source),
    uploadContainers: getUploadContainers(source),
  };
}
