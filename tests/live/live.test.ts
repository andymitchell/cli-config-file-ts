import { randomBytes } from "crypto";
import { existsSync } from "fs";
import { mkdir, readdir, readFile, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createTsConfig } from "../../src/createTsConfig.ts";


const __dirname = dirname(fileURLToPath(import.meta.url));

const tempId = randomBytes(16).toString('hex');
const sampleProjectDir = join(__dirname, 'sample-project');
const tempProjectsDir = join(__dirname, 'temp-projects');
const tempDir = join(tempProjectsDir, `temp-${tempId}`);

if( !existsSync(sampleProjectDir) ) {
    throw new Error("Sample project was expected with at least a type file");
}

async function cleanSampleConfigFiles() {
    const files = await readdir(sampleProjectDir);
    const configFiles = files.filter(f => f.endsWith(".config.ts"));
    await Promise.all(
    configFiles.map(f =>
        rm(join(sampleProjectDir, f), { force: true })
    )
    );
}

async function cleanTempProjectsDir() {
    await rm(tempProjectsDir, { recursive: true, force: true });
}

beforeAll(async () => {
    await cleanSampleConfigFiles();
    await cleanTempProjectsDir();
    await mkdir(tempProjectsDir, { recursive: true });
    await mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
    await cleanTempProjectsDir();
});

describe('create', () => {

    it('uses the correct type reference', async () => {

        const configFile = `typeref-${randomBytes(16).toString('hex')}.config.ts`;

        const configFilePath = join(sampleProjectDir, configFile);
        const typeFilePath = join(sampleProjectDir, 'types/types.ts');

        await createTsConfig(configFilePath, {
            config: {
                name: 'The Name'
            },
            constrainToType: {
                identifier: 'TestAppConfig',
                source: {
                    type: 'local',
                    absolutePath: typeFilePath
                }
            }
        })

        const content = await readFile(configFilePath, {encoding: 'utf-8'});
        expect(content).toContain(`import type {TestAppConfig} from "./types/types.ts";`);

    })

})