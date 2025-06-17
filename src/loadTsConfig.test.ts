// loader.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadInTsEnv, loadTsConfig, transpileAndImport } from './loadTsConfig.ts';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { execa } from 'execa';
import type { CreateIfNotFound } from './types.ts';
import { createTsConfig } from './createTsConfig.ts';


// --- Test Setup ---
const tempDir = path.join(tmpdir(), 'vitest-loader-tests');

beforeAll(async () => {
    // Create a temporary directory for our test config files
    if (existsSync(tempDir)) {
        await rm(tempDir, { recursive: true, force: true });
    }
    await mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
    // Clean up the temporary directory after all tests are done
    await rm(tempDir, { recursive: true, force: true });
});

// Helper to create a config file in the temp directory
const createTsConfigForTest = async (fileName: string, content: string) => {
    const filePath = path.join(tempDir, fileName);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
};

// --- Test Suites ---

describe('loadTsConfig', () => {
    describe('Input Validation and File Existence', () => {
        it('should throw an error if the path is not absolute', async () => {
            await expect(loadTsConfig('relative/path.ts')).rejects.toThrow(
                'Path must be absolute: received "relative/path.ts"'
            );
        });

        it('should throw an error if file does not exist and createIfNotFound is not provided', async () => {
            const nonExistentFile = path.join(tempDir, 'nonexistent.ts');
            await expect(loadTsConfig(nonExistentFile)).rejects.toThrow(
                `File not found: received "${nonExistentFile}"`
            );
        });
    });

    describe('File Creation (createIfNotFound)', () => {
        const defaultConfig = { port: 8080, host: 'localhost' };


        it('should create a file and prove the next run can read it', async () => {
            const newConfigFile = path.join(tempDir, 'new-config.ts');
            expect(existsSync(newConfigFile)).toBe(false);

            // Create it
            await loadTsConfig(newConfigFile, { config: defaultConfig, immediatelyUseConfig: true })

            // Now consume it
            const result = await loadTsConfig(newConfigFile);
            expect(result).toEqual(defaultConfig);

        });

        it('should create a file and throw an error to halt execution by default', async () => {
            const newConfigFile = path.join(tempDir, 'new-config-halt.ts');
            expect(existsSync(newConfigFile)).toBe(false);

            await expect(
                loadTsConfig(newConfigFile, { config: defaultConfig })
            ).rejects.toThrow(
                `A config file has been created at "${newConfigFile}". Please check the options and re-run this.`
            );

            // Check that the error has the correct cause for programmatic handling
            try {
                await loadTsConfig(newConfigFile, { config: defaultConfig });
            } catch (e: any) {
                console.log(defaultConfig, e);
                expect(e.cause).toEqual({ type: 'halt_and_check' });
            }
        });

        it('should create a file and return the config if immediatelyUseConfig is true', async () => {
            const newConfigFile = path.join(tempDir, 'new-config-immediate.ts');
            expect(existsSync(newConfigFile)).toBe(false);

            const result = await loadTsConfig(newConfigFile, {
                config: defaultConfig,
                immediatelyUseConfig: true
            });

            expect(result).toEqual(defaultConfig);
            expect(existsSync(newConfigFile)).toBe(true);
        });

    });

    describe('loadInTsEnv()', () => {

        it('succeeds (success=true) when Node can natively import the file (e.g. .mjs)', async () => {
            const fp = await createTsConfigForTest('config.mjs', `export default { esm: true };`);
            const result = await loadInTsEnv(fp);
            expect(result).toEqual({ success: true, mod: expect.objectContaining({ default: { esm: true } }) });
        });

        describe('TSX Environment (Native TS Import)', () => {
            const cliHelperPath = path.resolve(__dirname, 'test-cli-helper.ts');

            it('should successfully load a config using native TS import path', async () => {
                const expectedConfig = { native: true, mode: 'test' };
                const content = `export default ${JSON.stringify(expectedConfig)}`;
                const configFilePath = await createTsConfigForTest('native-test.ts', content);

                // Use execa to run tsx with our helper script and config file
                const { stdout, stderr, exitCode } = await execa(
                    'tsx',
                    [cliHelperPath, configFilePath]
                );

                // Assert that the process ran successfully
                expect(exitCode).toBe(0);
                expect(stderr).toBe('');

                // Assert that the output (the loaded config) is correct
                expect(JSON.parse(stdout)).toEqual(expectedConfig);
            });

            it('should propagate errors correctly when run in a native TS environment', async () => {
                const content = `export default { key: , }; // Syntax Error`;
                const configFilePath = await createTsConfigForTest('native-syntax-error.ts', content);

                // We expect this command to fail, so we wrap it in a try/catch
                // or use .rejects with Vitest's expect.
                await expect(
                    execa('tsx', [cliHelperPath, configFilePath])
                ).rejects.toThrow();

                try {
                    await execa('tsx', [cliHelperPath, configFilePath]);
                } catch (error: any) {
                    // `execa` throws an error object that contains process info
                    expect(error.exitCode).toBe(1);
                    // Check stderr for an error message. The exact message comes from the TS loader.
                    // This makes the test robust against changes in the error message format.
                    expect(error.stderr).toContain('Transform failed');
                }
            });
        });
    });

    describe('Module Export Parsing (Fallback via Transpilation)', () => {
        /**
         * NOTE: When running tests in a standard Node.js environment with Vitest,
         * `import('file.ts')` will fail with 'ERR_UNKNOWN_FILE_EXTENSION'.
         * This means these tests NATURALLY exercise the `transpileAndImport` fallback path,
         * which is exactly what we want to test.
         */

        it('should load a config with a direct call to transpile', async () => {
            const content = `export default { mode: 'production' };`;
            const configFile = await createTsConfigForTest('default-export-transpile.ts', content);

            const result = await transpileAndImport(configFile);
            expect(result.default).toEqual({ mode: 'production' });
        });

        it('should load a config with a default export', async () => {
            const content = `export default { mode: 'production' };`;
            const configFile = await createTsConfigForTest('default-export.ts', content);

            const config = await loadTsConfig(configFile);
            expect(config).toEqual({ mode: 'production' });
        });

        it('should load a config with a single named export', async () => {
            const content = `export const myConfig = { timeout: 5000 };`;
            const configFile = await createTsConfigForTest('named-export.ts', content);

            const config = await loadTsConfig(configFile);
            expect(config).toEqual({ timeout: 5000 });
        });

        it('should prioritize the default export if multiple exports exist', async () => {
            const content = `
                export const otherSetting = { enabled: false };
                export default { priority: 'high' };
            `;
            const configFile = await createTsConfigForTest('priority-export.ts', content);

            const config = await loadTsConfig(configFile);
            expect(config).toEqual({ priority: 'high' });
        });

        it('should handle CommonJS style exports correctly after transpilation', async () => {
            // `module.exports = ...` transpiles to a default export in ESM
            const content = `module.exports = { isCjs: true };`;
            const configFile = await createTsConfigForTest('cjs-export.ts', content);

            const config = await loadTsConfig(configFile);
            expect(config).toEqual({ isCjs: true });
        });
    });

    describe('Error Handling during Load', () => {
        it('should throw an error if the config file has no exports', async () => {
            const content = `const a = 1; let b = 2;`;
            const configFile = await createTsConfigForTest('no-exports.ts', content);

            await expect(loadTsConfig(configFile)).rejects.toThrow(
                'The config file must export something.'
            );
        });

        it('should throw an error if there are multiple named exports but no default', async () => {
            const content = `
                export const configA = { name: 'A' };
                export const configB = { name: 'B' };
            `;
            const configFile = await createTsConfigForTest('multiple-named.ts', content);

            await expect(loadTsConfig(configFile)).rejects.toThrow(
                'The config file must only have one export (or provide a default).'
            );
        });

        it('should propagate syntax errors from the config file', async () => {
            // This is an invalid object literal
            const content = `export default { key: , };`;
            const configFile = await createTsConfigForTest('syntax-error.ts', content);

            // The exact error message comes from the 'typescript' package and can be brittle.
            // We just need to ensure it rejects.
            await expect(loadTsConfig(configFile)).rejects.toThrow();
        });
    });

    describe('createTsConfigForTest', () => {

        it('should create a basic config file without type constraints', async () => {
            const configFilePath = path.join(tempDir, 'basic-config.ts');
            const details: CreateIfNotFound = {
                config: { port: 3000, host: '0.0.0.0' },
            };

            await createTsConfig(configFilePath, details);

            const content = await readFile(configFilePath, 'utf-8');

            const expectedContent = [
                '// Please review and adjust these settings as needed for your project.',
                '',
                'export const config = {',
                '    "port": 3000,',
                '    "host": "0.0.0.0"',
                '};'
            ].join('\n');

            expect(content).toBe(expectedContent);
        });

        it('should add an import from a package for a type constraint', async () => {
            const configFilePath = path.join(tempDir, 'package-typed-config.ts');
            const details: CreateIfNotFound = {
                config: { setting: 'value' },
                constrainToType: {
                    identifier: 'MyConfigType',
                    source: {
                        type: 'package',
                        packageName: '@my-org/my-package'
                    }
                }
            };

            await createTsConfig(configFilePath, details);
            const content = await readFile(configFilePath, 'utf-8');

            // Check that all parts exist in the correct order
            expect(content).toContain('import {MyConfigType} from "@my-org/my-package";');
            expect(content).toContain('// Please review and adjust these settings as needed for your project.');
            expect(content).toContain('export const config:MyConfigType = {');

            const importIndex = content.indexOf('import');
            const exportIndex = content.indexOf('export');
            const commentIndex = content.indexOf('//');

            expect(commentIndex).toBe(0); // Comment must be first
            expect(importIndex).toBeGreaterThan(commentIndex); // Import after comment
            expect(exportIndex).toBeGreaterThan(importIndex); // Export after import
        });

        it('should add an import with a relative path for a local type constraint', async () => {
            // Setup a directory structure to test relative path calculation
            const configDir = path.join(tempDir, 'config-location');
            const typesDir = path.join(tempDir, 'types-location');
            await mkdir(configDir, { recursive: true });
            await mkdir(typesDir, { recursive: true });

            const configFilePath = path.join(configDir, 'local-typed-config.ts');
            const typeDefinitionPath = path.join(typesDir, 'custom-types.ts');

            const details: CreateIfNotFound = {
                config: { theme: 'dark' },
                constrainToType: {
                    identifier: 'AppThemeConfig',
                    source: {
                        type: 'local',
                        absolutePath: typeDefinitionPath
                    }
                }
            };

            await createTsConfig(configFilePath, details);
            const content = await readFile(configFilePath, 'utf-8');

            // Calculate the expected relative path exactly as the function does
            const expectedRelativePath = path.relative(configFilePath, typeDefinitionPath);


            expect(content).toContain(`import {AppThemeConfig} from "${expectedRelativePath}";`);
            expect(content).toContain('export const config:AppThemeConfig = {');
        });
    });
});