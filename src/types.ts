
export type CreateIfNotFound = {
    config: any

    /**
     * Return the default config from the newly created file.
     * 
     * You probably don't want to do this, as the user may wish to check the config in the file before allowing further execution. 
     * 
     * If this is false, it'll throw an error informing the user a file has been created and they should check it. 
     */
    immediatelyUseConfig?: boolean
}

