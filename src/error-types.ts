/**
 * ---------------------------------------------------------------------------
 *  Config-loading error causes
 * ---------------------------------------------------------------------------
 * All `Error.cause.type` literals that the helpers in **loadTsConfig*.ts**
 * may emit, expressed as a discriminated-union so they can be handled
 * exhaustively with good IntelliSense support.
 */

/**
 * The specified path does not exist **or** is not absolute.
 * When present, `reason` narrows the root cause further
 * (e.g. `'not_absolute_path'`).
 */
export interface FileNotFoundCause {
    type: 'file_not_found';
    reason?: string;
}

/**  
 * A default config file was written to disk and execution should stop so the
 * user can review the file before continuing.  
 */
export interface HaltAndCheckCause {
    type: 'halt_and_check';
}

/**  
 * The loaded module exported nothing – a config object is required.  
 */
export interface NoExportsCause {
    type: 'no_exports';
}

/**  
 * The module exported more than one named export and no `default`, so the
 * loader cannot decide which one is the config object.  
 */
export interface UncertainExportCause {
    type: 'uncertain_export';
}

/**  
 * The *fallback* config supplied through `createIfNotFound.config` failed Zod
 * validation.  
 */
export interface InvalidDefaultConfigFormatCause {
    type: 'invalid_default_config_format';
}

/**  
 * The user-provided config file was loaded successfully but failed Zod
 * validation.  
 */
export interface InvalidConfigFormatCause {
    type: 'invalid_config_format';
}

/**
 * Union of **all** known `Error.cause` variants produced by the config
 * loaders.  Narrowing to this type lets TypeScript’s control-flow analysis
 * give you exhaustive checks on `cause.type`.
 */
export type ConfigLoadErrorCause =
    | FileNotFoundCause
    | HaltAndCheckCause
    | NoExportsCause
    | UncertainExportCause
    | InvalidDefaultConfigFormatCause
    | InvalidConfigFormatCause;

/**
 * Type-guard that returns `true` when the value is one of the recognised
 * `ConfigLoadErrorCause` shapes.
 *
 * @example
 * ```ts
 * try {
 *   await loadTsConfigWithSchema(absolutePath, schema);
 * } catch (err) {
 *   if (isKnownCause((err as Error).cause)) {
 *     // `cause` is now typed and you can switch on cause.type:
 *     switch (err.cause.type) {
 *       case 'file_not_found':
 *         …
 *     }
 *   }
 * }
 * ```
 */
export function isKnownCause(cause: unknown): cause is ConfigLoadErrorCause {
    if (!cause || typeof cause !== 'object' || !('type' in cause)) {
        return false;
    }

    const type = (cause as { type: ConfigLoadErrorCause['type'] }).type;
    switch (type) {
        case 'file_not_found':
        case 'halt_and_check':
        case 'no_exports':
        case 'uncertain_export':
        case 'invalid_default_config_format':
        case 'invalid_config_format':
            return true;
        default:
            const _exhaustiveCheck:never = type;
            void _exhaustiveCheck;
            return false;
    }
}
