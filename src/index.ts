import { createTsConfig } from "./createTsConfig.ts";
import { isKnownCause, type ConfigLoadErrorCause } from "./error-types.ts";
import {  loadTsConfig } from "./loadTsConfig.ts";
import type { CreateIfNotFound } from "./types.ts";

export {
    loadTsConfig,
    createTsConfig,
    isKnownCause
}

export type {
    ConfigLoadErrorCause,
    CreateIfNotFound
}