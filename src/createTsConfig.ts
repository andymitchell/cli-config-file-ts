import { writeFile } from "fs/promises";
import type { CreateIfNotFound } from "./types.ts";
import path, { dirname, relative } from "path";

/**
 * Create a config file from a default object.
 * 
 * @param absolutePath The location to write the file to 
 * @param details The default object for the config
 */
export async function createTsConfig(absolutePath: string, details:CreateIfNotFound):Promise<void> {
    if (!path.isAbsolute(absolutePath)) {
        throw new Error(`Path must be absolute: received "${absolutePath}"`, { cause: { type: 'invalid_path'} });
    }

    // --- Heuristic Check using path.extname ---
    // This non-robust check assumes that any path without a file extension
    // is a directory. It will fail for valid filenames without extensions.
    if (path.extname(absolutePath) === '') {
        throw new Error(
            `The provided path "${absolutePath}" appears to be a directory because it lacks a file extension. Please provide a complete path to a file (e.g., "${absolutePath}.ts").`, 
            { cause: { type: 'invalid_path'} }
        );
    }

    let content = `export const config${details.constrainToType? `:${details.constrainToType.identifier}` : ''} = ${JSON.stringify(details.config, undefined, 4)};`.trim();

    if( details.constrainToType ) {
        let source: string;
        if( details.constrainToType.source.type==='package' ) {
            source = details.constrainToType.source.packageName;
        } else {
            source = relative(dirname(absolutePath), details.constrainToType.source.absolutePath);
            if( !source.startsWith('.') ) source = `./${source}`;
        }
        content = `import type {${details.constrainToType.identifier}} from "${source}";\n\n${content}`;
    }

    content = `// Please review and adjust these settings as needed for your project.\n\n${content}`;

    await writeFile(absolutePath, content, {encoding: 'utf-8'});
}