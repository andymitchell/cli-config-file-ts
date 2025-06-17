import { defineConfig } from "tsup";
 
export default defineConfig({
  entry: {
    'index': "src/index.ts",
    'index-schema': "src/index-schema.ts"
  },
  publicDir: false,
  clean: true,
  target: ['esnext'],
  minify: false,
  splitting: true,
  external: [
    'zod'
  ],
  dts: true,
  format: ['esm'],
});