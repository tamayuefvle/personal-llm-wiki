import path from "node:path";

import { WikiError } from "./errors.js";
import type { VaultResolution } from "./model.js";

export interface ResolveVaultOptions {
  cliPath?: string;
  environment?: NodeJS.ProcessEnv;
  cwd?: string;
}

export function resolveVault(options: ResolveVaultOptions = {}): VaultResolution {
  const environment = options.environment ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const cliPath = options.cliPath?.trim();

  if (cliPath) {
    return {
      path: path.resolve(cwd, cliPath),
      source: "--vault",
    };
  }

  const environmentPath = environment.LLM_WIKI_VAULT?.trim();
  if (environmentPath) {
    return {
      path: path.resolve(cwd, environmentPath),
      source: "LLM_WIKI_VAULT",
    };
  }

  throw new WikiError(
    "Vault is not configured. Pass --vault <path> or set LLM_WIKI_VAULT.",
    "VAULT_NOT_CONFIGURED",
    2,
  );
}
