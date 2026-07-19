export type PlatformUploadContent = string | number | boolean | Record<string, unknown> | Array<unknown>;

export type PlatformUploadResponse = {
  cin: {
    rn?: string;
    ri?: string;
    con?: PlatformUploadContent;
  };
};

export async function uploadPlatformContent(
  featureKey: string,
  content: PlatformUploadContent,
): Promise<PlatformUploadResponse> {
  const response = await fetch(`/api/platform-upload/${featureKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload platform content: ${response.status}`);
  }

  return response.json() as Promise<PlatformUploadResponse>;
}
