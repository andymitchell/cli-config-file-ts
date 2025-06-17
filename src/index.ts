import { isKnownCause, type ConfigLoadErrorCause } from "./error-types.ts";
import { createConfigFile, loadTsConfig } from "./loadTsConfig.ts";
import type { CreateIfNotFound } from "./types.ts";

export {
    loadTsConfig,
    createConfigFile,
    isKnownCause
}

export type {
    ConfigLoadErrorCause,
    CreateIfNotFound
}