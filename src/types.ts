
export type CreateIfNotFound<T extends object = any> = {
    config: T

    /**
     * Return the default config from the newly created file.
     * 
     * You probably don't want to do this, as the user may wish to check the config in the file before allowing further execution. 
     * 
     * If this is false, it'll throw an error informing the user a file has been created and they should check it. 
     */
    immediatelyUseConfig?: boolean,


    /**
     * Type-constrain the config declaration, to give the user helpful type hints.
     * 
     * @example {identifier: 'SecureThisConfig', source: {type: 'package', packageName: '@the/X'}}
     * // Adds `import {SecureThisConfig} from '@the/X';`
     */
    constrainToType?: {
        /**
         * The type identifier for the config
         */
        identifier: string,
        /**
         * Where the type identifier is declared. 
         * 
         * Use a package unless testing
         */
        source: {
            type: 'package',
            packageName: string
        } | {
            type: 'local',
            absolutePath: string
        }
    }
}

