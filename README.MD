# @andyrmitchell/cli-config-file-ts

**Load and validate TypeScript config files — modern, minimal, and dependency-free (unless you choose to validate with Zod).**

## ✨ Features

- **Modern ESM only** — small, fast, no CommonJS legacy.
- **Zero dependencies** — unless you opt into schema validation with `zod`.
- **Supports native TS environments** — works out of the box in runtimes like Bun or tsx.
- **Automatic fallback to transpilation** — no TS loader? It’ll transpile your config on the fly.
- **Optional Zod validation** — validate your config with a schema (via a separate export).
- **Create default config if missing** — optionally auto-generate a config file.

---

## 🚀 Installation

```bash
npm install @andyrmitchell/cli-config-file-ts
```

If you want to use **Zod validation**, install `zod`:

```bash
npm install zod
```

---

## ⚡ Quick Usage

### Load a config file

```ts
import { loadTsConfig } from "@andyrmitchell/cli-config-file-ts";

const config = await loadTsConfig("/absolute/path/to/config.ts");
console.log(config);
```

👉 You can also explicitly type it if needed:

```ts
const config = await loadTsConfig<{ port: number }>(
  "/absolute/path/to/config.ts"
);
// config: {port: number}
```

Note if you want to type it, it's best to use a zod schema to validate it (see below).

---

### Provide a default if file doesn’t exist

```ts
const config = await loadTsConfig("/absolute/path/to/config.ts", {
  config: { port: 3000, host: "localhost" },
});
```

👉 If the file is missing:

- It writes the default config.
- Throws an error prompting you to check the new file to confirm you're happy with the defaults and then re-run it.

👉 If you want to **immediately use** the generated config:

```ts
const config = await loadTsConfig("/absolute/path/to/config.ts", {
  config: { port: 3000, host: "localhost" },
  immediatelyUseConfig: true,
});
```

---

### Validate config with Zod (with type inference)

```ts
import { z } from "zod";
import { loadTsConfigWithSchema } from "@andyrmitchell/cli-config-file-ts/schema";

// Define your Zod schema
const schema = z.object({
  port: z.number(),
  host: z.string(),
});

// The returned config is fully typed!
const config = await loadTsConfigWithSchema(
  "/absolute/path/to/config.ts",
  schema
);

// `config` is inferred as { port: number; host: string }
console.log(config.port.toFixed(0)); // fully typed as number
console.log(config.host.toUpperCase()); // fully typed as string
```

If validation fails, you’ll get clear error messages like:

```
Config file did not match schema. Validation errors:
port: Expected number, received string
```

---

## 🌟 Example config.ts

```ts
export default {
  port: 3000,
  host: "localhost",
};
```

or

```ts
export const config = {
  port: 3000,
  host: "localhost",
};
```

---

## 📝 Notes

- The path you pass must be **absolute**.
- Requires Node.js `>=19.0.0`.
- Supports native TypeScript loading in compatible environments (e.g. Bun, tsx). Falls back to internal transpilation otherwise.

---

## 🛡️ Error handling with isKnownCause

If you want to surface clear, typed information from loader errors you can check the Error.cause against the helper function isKnownCause.

```ts
try {
  const config = await loadTsConfig("/absolute/path/to/config.ts");
  // …use your config here…
} catch (err) {
  // First, make sure it's an `Error` and has a `.cause`
  if (err instanceof Error && isKnownCause(err.cause)) {
    switch (err.cause.type) {
      case "file_not_found":
        console.error("Config file not found:", err.cause.reason);
        break;
      case "invalid_config_format":
        console.error("Config failed schema validation.");
        break;
      default:
        console.error("Unhandled config loader error:", err.cause.type);
    }
  } else {
    // Unknown error — re‑throw or handle generically
    throw err;
  }
}
```

---

## 📦 Exports

| Export                                     | What it does                               |
| ------------------------------------------ | ------------------------------------------ |
| `@andyrmitchell/cli-config-file-ts`        | Core loader without schema validation      |
| `@andyrmitchell/cli-config-file-ts/schema` | Loader with optional Zod schema validation |
