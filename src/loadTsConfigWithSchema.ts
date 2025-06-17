
import type { AnyZodObject, SafeParseError, z } from "zod";
import { loadTsConfig } from "./loadTsConfig.ts";
import type { CreateIfNotFound } from "./types.ts";

/**
 * Loads a TypeScript config file. 
 * 
 * Supports files that export a default export or a single named export.
 *
 * @param absolutePath Absolute path to the TypeScript config file.
 * @param schema The Zod schema that the config must adhere to
 * @param createIfNotFound If present, write a file with the provided config. By default it'll still throw an error advising the user to check the default parameters.
 * @returns A Promise resolving to the default export (if present) or the only named export. 
 * @throws {Error} If cannot find file
 * @throws {Error} If no usable export is found
 * @throws {Error} If multiple named exports exist without a default 
 * @throws {Error} If config object fails to validate against schema
 */
export async function loadTsConfigWithSchema<S extends AnyZodObject>(absolutePath: string, schema: S, createIfNotFound?: CreateIfNotFound): Promise<z.infer<S>> {
    
    if( createIfNotFound ) {
        const result = schema.safeParse(createIfNotFound.config);
        if( !result.success ) {
            throw new Error(`createIfNotFound.config did not match schema. Validation errors: \n${convertSchemaErrorIntoMessage(result)}`, {cause: {type: 'invalid_default_config_format'}});
        }
    }

    const obj = await loadTsConfig(absolutePath, createIfNotFound);

    const result = schema.safeParse(obj);
    if( !result.success ) {
        
        
        throw new Error(`Config file did not match schema. Validation errors: \n${convertSchemaErrorIntoMessage(result)}`, {cause: {type: 'invalid_config_format'}});
    }

    return obj;
    

}

function convertSchemaErrorIntoMessage(parseError:SafeParseError<{[x: string]: any}>):string {
    return parseError.error.errors
            .map((err) => {
            const path = err.path.join('.') || 'root';
            return `${path}: ${err.message}`;
            })
            .join('\n');
}