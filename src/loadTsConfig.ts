import { randomBytes } from "crypto";
import { unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path, { join } from "path";
import { pathToFileURL } from "url";

import { existsSync } from "fs";
import type { CreateIfNotFound } from "./types.ts";
import { createTsConfig } from "./createTsConfig.ts";
import { build } from "esbuild";



/**
 * Loads a TypeScript config file. 
 * 
 * Supports files that export a default export or a single named export.
 *
 * @param absolutePath Absolute path to the TypeScript config file.
 * @param createIfNotFound If present, write a file with the provided config. By default it'll still throw an error advising the user to check the default parameters.
 * @returns A Promise resolving to the default export (if present) or the only named export. 
 * @throws {Error} If cannot find file
 * @throws {Error} If no usable export is found
 * @throws {Error} If multiple named exports exist without a default 
 */
export async function loadTsConfig<T extends object = any>(absolutePath: string, createIfNotFound?: CreateIfNotFound<T>): Promise<T> {
    if (!path.isAbsolute(absolutePath)) {
        throw new Error(`Path must be absolute: received "${absolutePath}"`, { cause: { type: 'invalid_path'} });
    }

    if (!existsSync(absolutePath)) {
        if (createIfNotFound) {
            await createTsConfig(absolutePath, createIfNotFound);
            if (createIfNotFound.immediatelyUseConfig) {
                return createIfNotFound.config as T;
            } else {
                throw new Error(`A config file has been created at "${absolutePath}". Please check the options and re-run this.`, { cause: { type: 'halt_and_check' } });
            }
        } else {
            throw new Error(`File not found: received "${absolutePath}"`, { cause: { type: 'file_not_found' } })
        }
    }

    // Dynamically import the module
    let mod: any;
    const result = await loadInTsEnv(absolutePath);
    if (result.success) {
        mod = result.mod;
    } else if (result.noTs) {
        console.log("No ts loader found. Switching to transpilation.");
        mod = await transpileAndImport(absolutePath);
    } else {
        throw result.error;
    }

    // Prefer default export if available
    if (mod.default && typeof mod.default === 'object') {
        return mod.default as T;
    }

    const keys = Object.keys(mod);
    const firstKey = keys[0];
    if (!firstKey) {
        throw new Error("The config file must export something.", { cause: { type: 'no_exports' } });
    }
    if (keys.length > 1) {
        throw new Error("The config file must only have one export (or provide a default).", { cause: { type: 'uncertain_export' } });
    }
    return mod[firstKey] as T;

}



/**
 * Attempt to use the native typescript import.
 * 
 * This only works if running an environment with a built in ts loader, e.g. bun, tsx 
 * 
 * @param absolutePath 
 * @returns 
 */
export async function loadInTsEnv(absolutePath: string): Promise<{ success: true; mod: any; } | { success: false; noTs: boolean; error: Error; }> {
    const fileUrl = pathToFileURL(absolutePath).href;

    try {
        const mod = await import(fileUrl);
        return { success: true, mod };
    } catch (error: any) {
        if (error.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
            // The environment doesn't support TS natively, so fall back to transpiling.
            return { success: false, noTs: true, error };
        } else {
            // It's a different error (e.g., a syntax error in the config file)
            return { success: false, noTs: false, error };
        }
    }
}

/**
 * Fallback function to transpile and import a TS file.
 * This is only called when a native import fails.
 */
export async function transpileAndImport<T extends object = any>(absolutePath: string): Promise<T> {

    const tempId = randomBytes(16).toString('hex');
    const tempFile = join(tmpdir(), `temp-config-${tempId}.mjs`);

    try {
        // Use esbuild to transpile and bundle the TS file into a single JS string
        const result = await build({
            entryPoints: [absolutePath],
            outfile: 'out.js', // Required, but not used when write is false
            bundle: true,      // Bundle any local imports
            write: false,      // Return the result as a string instead of writing to disk
            format: 'esm',     // Output as an ES Module
            platform: 'node',  // Target the Node.js platform
            target: 'esnext',  // Target modern JavaScript
        });

        const jsCode = result.outputFiles[0]?.text;
        if( !jsCode ) throw new Error("Could not transpile the config file.", {cause: {type: 'transpile_failed'}})

        await writeFile(tempFile, jsCode);

        // Import the transpiled MJS file. The `?v=<timestamp>` is a cache-busting trick.
        const module = await import(`${pathToFileURL(tempFile).href}?v=${Date.now()}`);

        // The main function will handle extracting the default or named export.
        // We just return the entire module namespace object.
        return module;

    } finally {
        try {
            // Clean up the temporary file
            await unlink(tempFile);
        } catch {
            // Suppress cleanup errors, as they are not critical
        }
    }
}