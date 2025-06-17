/**
 * This is a helper script designed to be run by `tsx`.
 * It imports the loader, loads a config file specified by a command-line argument,
 * and prints the resulting config object as JSON to stdout.
 * This allows us to test the native TS import path of the loader.
 */
import path from 'path';
import { loadTsConfig } from './loadTsConfig.ts';

async function main() {
    const relativePath = process.argv[2];

    if (!relativePath) {
        console.error('Usage: tsx cli-helper.ts <path/to/config.ts>');
        process.exit(1);
    }
    
    // The loader requires an absolute path.
    const absolutePath = path.resolve(relativePath);

    try {
        const config = await loadTsConfig(absolutePath);
        // On success, print the JSON config to stdout.
        // This is easy for the test runner to parse.
        console.log(JSON.stringify(config));
    } catch (error: any) {
        // On failure, print the error to stderr and exit with a non-zero code.
        console.error(error.message);
        process.exit(1);
    }
}

main();