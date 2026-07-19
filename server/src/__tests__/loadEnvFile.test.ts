import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvFile } from "../config/loadEnvFile.js";

const tempDirs: string[] = [];

describe("loadEnvFile", () => {
  afterEach(() => {
    delete process.env.TEST_MOBIUS_ENV_VALUE;
    tempDirs.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }));
  });

  it("finds a .env file in a parent directory", () => {
    const root = mkdtempSync(join(tmpdir(), "sleeper-env-"));
    const child = join(root, "server");
    tempDirs.push(root);
    mkdirSync(child);
    writeFileSync(join(root, ".env"), "TEST_MOBIUS_ENV_VALUE=loaded\n", "utf8");

    loadEnvFile(".env", child);

    expect(process.env.TEST_MOBIUS_ENV_VALUE).toBe("loaded");
  });
});
