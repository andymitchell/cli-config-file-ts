import { writeFile } from "fs/promises";
import type { CreateIfNotFound } from "./types.ts";
import { relative } from "path";

/**
 * Create a config file from a default object.
 * 
 * @param absolutePath The location to write the file to 
 * @param details The default object for the config
 */
export async function createTsConfig(absolutePath: string, details:CreateIfNotFound):Promise<void> {


    let content = `export const config${details.constrainToType? `:${details.constrainToType.identifier}` : ''} = ${JSON.stringify(details.config, undefined, 4)};`.trim();

    if( details.constrainToType ) {
        let source: string;
        if( details.constrainToType.source.type==='package' ) {
            source = details.constrainToType.source.packageName;
        } else {
            source = relative(absolutePath, details.constrainToType.source.absolutePath);
        }
        content = `import {${details.constrainToType.identifier}} from "${source}";\n\n${content}`;
    }

    content = `// Please review and adjust these settings as needed for your project.\n\n${content}`;

    await writeFile(absolutePath, content, {encoding: 'utf-8'});
}