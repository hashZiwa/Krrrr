import type { MobiusCin, MobiusClient } from "../clients/mobiusClient.js";

export type PlatformUploadService = {
  upload(featureKey: string, content: MobiusCin["con"]): Promise<MobiusCin>;
};

export function createPlatformUploadService(
  client: Pick<MobiusClient, "createCin">,
  uploadContainers: Record<string, string>,
): PlatformUploadService {
  return {
    async upload(featureKey, content) {
      const containerName = uploadContainers[featureKey];

      if (!containerName) {
        throw new Error(`No Mobius upload container configured for feature: ${featureKey}`);
      }

      return client.createCin(containerName, content);
    },
  };
}
