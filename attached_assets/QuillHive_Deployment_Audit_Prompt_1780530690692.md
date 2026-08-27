# QuillHive — Complete Production Deployment Audit Prompt

You are a senior DevOps engineer, TypeScript architect, monorepo specialist, and full-stack deployment expert.

**Project:** QuillHive — a hybrid social/professional platform for creatives. Combines community feeds, professional networking, and publishing tools.

Your task is to perform a COMPLETE production deployment audit and fix of this repository.

**GOAL:**
The project must build successfully, pass all type checks, resolve all monorepo issues, install dependencies correctly, and deploy successfully on platforms such as:
- Cloudflare Pages
- Cloudflare Workers
- Render
- Railway
- Vercel
- Netlify
- Fly.io
- Docker-based hosts

ANALYZE EVERYTHING.

---

## REPOSITORY SNAPSHOT

This is the actual repository structure and content extracted from the latest uploaded codebase zip (`QuillHive-main`). Use this data as the source of truth.

### Top-Level Layout

```
QuillHive-main/
├── .github/workflows/ci.yml
├── .npmrc
├── .replit / .replitignore / replit.md / replit.nix   ← Replit-specific, must be excluded from deploys
├── apps/
│   ├── api/          ← Express 5 + Node.js API server  (@workspace/api-server)
│   ├── public-web/   ← Next.js 14 SSR public-facing app (@quillhive/public-web)
│   └── web/          ← Vite + React SPA               (@workspace/quillhive)
├── artifacts/quillhive/   ← Vite/React mockup sandbox (NOT deployed)
├── features/quillhive/
│   ├── mockup-sandbox/    ← Another Vite mockup sandbox
│   └── scripts/           ← Internal feature scripts
├── packages/utils/
│   ├── db/               ← Drizzle ORM + PostgreSQL schema (@workspace/db)
│   ├── api-client-react/ ← Orval-generated React Query client (@workspace/api-client-react)
│   ├── api-zod/          ← Orval-generated Zod validators (@workspace/api-zod)
│   └── api-spec/         ← OpenAPI spec + orval config (@workspace/api-spec)
├── scripts/              ← Root-level build/dev scripts
├── package.json          ← Root workspace (name: "workspace")
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json         ← References packages/utils/* only
```

---

## PHASE 1 — REPOSITORY AUDIT

### Actual pnpm-workspace.yaml

```yaml
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  - '@replit/*'
  - stripe-replit-sync

packages:
  - artifacts/*
  - scripts
  - apps/*
  - apps/public-web
  - packages/utils/*
  - features/quillhive/mockup-sandbox
  - features/quillhive/scripts

catalog:
  '@replit/vite-plugin-cartographer': ^0.5.1
  '@replit/vite-plugin-dev-banner': ^0.1.1
  '@replit/vite-plugin-runtime-error-modal': ^0.0.6
  '@tailwindcss/vite': ^4.1.14
  '@tanstack/react-query': ^5.90.21
  '@types/node': ^25.3.3
  '@types/react': ^19.2.0
  '@types/react-dom': ^19.2.0
  '@vitejs/plugin-react': ^5.0.4
  class-variance-authority: ^0.7.1
  clsx: ^2.1.1
  drizzle-orm: ^0.45.1
  framer-motion: ^12.23.24
  lucide-react: ^0.545.0
  react: 19.1.0        # pinned exact version
  react-dom: 19.1.0    # pinned exact version
  tailwind-merge: ^3.3.1
  tailwindcss: ^4.1.14
  tsx: ^4.21.0
  vite: ^7.3.0
  zod: ^3.25.76

autoInstallPeers: false

onlyBuiltDependencies:
  - '@swc/core'
  - esbuild
  - msw
  - unrs-resolver

overrides:
  # All non-linux-x64 esbuild/rollup/lightningcss/tailwindcss-oxide/expo-ngrok binaries excluded (Replit linux-x64 only)
  # These exclusions WILL BREAK builds on macOS, Windows, arm64, and Docker alpine images.
  "esbuild>@esbuild/darwin-arm64": "-"
  "esbuild>@esbuild/darwin-x64": "-"
  # ... (all non-linux-x64 esbuild platforms excluded)
  "rollup>@rollup/rollup-darwin-arm64": "-"
  # ... (all non-linux-x64 rollup platforms excluded)
  "@tailwindcss/oxide>@tailwindcss/oxide-darwin-arm64": "-"
  # ... (all non-linux-x64 oxide platforms excluded)
  "@esbuild-kit/esm-loader": "npm:tsx@^4.21.0"
  esbuild: "0.27.3"
```

### Root package.json

```json
{
  "name": "workspace",
  "version": "0.0.0",
  "license": "MIT",
  "scripts": {
    "preinstall": "sh -c 'rm -f package-lock.json yarn.lock; case \"$npm_config_user_agent\" in pnpm/*) ;; *) echo \"Use pnpm instead\" >&2; exit 1 ;; esac'",
    "build": "pnpm run typecheck && pnpm -r --if-present run build",
    "typecheck:libs": "tsc --build",
    "typecheck": "pnpm run typecheck:libs && pnpm -r --filter \"./artifacts/**\" --filter \"./scripts\" --if-present run typecheck"
  },
  "private": true,
  "devDependencies": {
    "prettier": "^3.8.1",
    "typescript": "~5.9.2"
  },
  "dependencies": {
    "cloudinary": "^2.10.0"
  }
}
```

**⚠️ KNOWN ISSUE:** `cloudinary` is in root `dependencies`, not inside `apps/api`. This causes it to be installed at the workspace root even though it is only used by the API server.

### .npmrc

```ini
auto-install-peers=false
strict-peer-dependencies=false
```

---

## PHASE 2 — TYPESCRIPT AUDIT

### tsconfig.base.json (shared base)

```json
{
  "compilerOptions": {
    "isolatedModules": true,
    "lib": ["es2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmitOnError": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": false,
    "noImplicitReturns": true,
    "noUnusedLocals": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": false,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "skipLibCheck": true,
    "target": "es2022",
    "types": [],
    "customConditions": ["workspace"]
  }
}
```

### Root tsconfig.json

```json
{
  "extends": "./tsconfig.base.json",
  "compileOnSave": false,
  "files": [],
  "references": [
    { "path": "./packages/utils/db" },
    { "path": "./packages/utils/api-client-react" },
    { "path": "./packages/utils/api-zod" }
  ]
}
```

**⚠️ KNOWN ISSUE:** Root tsconfig only references `packages/utils/*`. It does NOT reference `apps/api`, `apps/web`, or `apps/public-web`. Those are typechecked only through their own `pnpm --filter` commands in CI, not through composite project references.

### apps/api/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"],
    "noImplicitAny": false,      // ← overrides base; implicit any allowed in API
    "noImplicitReturns": false   // ← overrides base
  },
  "include": ["src"],
  "exclude": ["src/__tests__"],
  "references": [
    { "path": "../../packages/utils/db" },
    { "path": "../../packages/utils/api-zod" }
  ]
}
```

**⚠️ KNOWN ISSUE:** `noImplicitAny: false` silently disables TS2006/TS7006 errors. Hidden type bugs will exist. Also missing `composite: true` — API references `@workspace/db` and `@workspace/api-zod` which are composite packages, but the API itself is not composite.

### apps/web/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

**⚠️ KNOWN ISSUE:** Does NOT extend `tsconfig.base.json`. Also does NOT declare project references to `@workspace/api-client-react`, which it imports. TypeScript will resolve those imports at runtime through pnpm workspace links, but there is no compile-time reference graph.

### apps/public-web/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**⚠️ KNOWN ISSUE:** Next.js requires `moduleResolution: "node"` or `"node16"` or `"nodenext"` — NOT `"bundler"`. Using `bundler` with Next.js 14 causes module resolution failures for packages that do not export `exports` fields, and breaks `next build`.

### packages/utils/db/tsconfig.json

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

**⚠️ KNOWN ISSUE:** `dist/` does not exist in the repository. It must be built before any consumer (`apps/api`) can import it via TypeScript project references. CI partially handles this but it is a consistent source of fresh-clone failures.

### packages/utils/api-client-react/tsconfig.json

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["dom", "es2022"]
  },
  "include": ["src"]
}
```

**⚠️ KNOWN ISSUE:** `dist/` not present in repository. Missing build step.

### packages/utils/api-zod/tsconfig.json

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**⚠️ KNOWN ISSUE (CRITICAL):** `src/index.ts` imports from `./generated/types` which is a **directory** (confirmed), not a file. The actual types are in `src/generated/types/index.ts`. Depending on module resolution settings, this import may silently resolve or fail with TS2307 at typecheck time.

```ts
// packages/utils/api-zod/src/index.ts — actual content:
export type { GetGroupPostsParams as ApiGetGroupPostsParams } from "./generated/api";
export type { GetGroupPostsParams as TypesGetGroupPostsParams } from "./generated/types";
//                                                                   ^^^^^^^^^^^^^^^^
// This resolves to a directory — must resolve to ./generated/types/index.ts
// Works with "moduleResolution": "bundler" but FAILS with "node" or "node16"
```

---

## PHASE 3 — MONOREPO AUDIT

### Workspace Packages

| Package Name | Path | Exports |
|---|---|---|
| `@workspace/api-server` | `apps/api` | none (app) |
| `@workspace/quillhive` | `apps/web` | none (app) |
| `@quillhive/public-web` | `apps/public-web` | none (app) |
| `@workspace/db` | `packages/utils/db` | `"."` → `./src/index.ts`, `"./schema"` → `./src/schema/index.ts` |
| `@workspace/api-client-react` | `packages/utils/api-client-react` | `"."` → `./src/index.ts` |
| `@workspace/api-zod` | `packages/utils/api-zod` | `"."` → `./src/index.ts` |
| `@workspace/api-spec` | `packages/utils/api-spec` | none (codegen tool) |

**⚠️ KNOWN ISSUE:** All internal packages export their raw `.ts` source files directly (e.g. `"." : "./src/index.ts"`). This works for pnpm workspace consumers using `"moduleResolution": "bundler"` but **breaks** for any tool that expects compiled `.js` + `.d.ts` outputs. Specifically:
- `drizzle-kit` commands run via `tsx` but if `DATABASE_URL` is missing the import chain fails early
- Any CI step that runs `tsc --build` on the root must build packages before apps

**⚠️ KNOWN ISSUE:** `pnpm-workspace.yaml` lists both `apps/*` and `apps/public-web` separately — `apps/public-web` would already be matched by `apps/*`. This is redundant but harmless.

**⚠️ KNOWN ISSUE:** The `artifacts/*` glob matches `artifacts/quillhive/` which is a Vite sandbox app. This is included in the workspace but appears to be a design/mockup artifact, not a deployable app. It has its own `package.json` and tsconfig. It should either be excluded from the workspace or explicitly tagged as non-deployable.

**⚠️ KNOWN ISSUE (CRITICAL):** The `features/quillhive/scripts` package is in the workspace but has no build or typecheck script. It contains `src/hello.ts` which appears to be a placeholder.

### Dependency Graph

```
apps/web (@workspace/quillhive)
  └── @workspace/api-client-react
        └── @tanstack/react-query (catalog)

apps/api (@workspace/api-server)
  ├── @workspace/db
  │     ├── drizzle-orm (catalog)
  │     ├── drizzle-zod
  │     ├── pg
  │     └── zod (catalog)
  └── @workspace/api-zod
        └── zod (catalog)

apps/public-web (@quillhive/public-web)
  └── (no internal workspace deps — standalone Next.js app)
```

**⚠️ KNOWN ISSUE:** `apps/public-web` uses React 18 (`^18.3.0`) while the catalog pins React at exactly `19.1.0`. This is a **version conflict**. If any dependency hoisting occurs, React 18 and React 19 could co-exist in node_modules causing runtime failures (duplicate React instances, hook errors).

---

## PHASE 4 — DEPENDENCY AUDIT

### apps/api/package.json — Dependencies

```json
{
  "dependencies": {
    "@upstash/redis": "^1.38.0",
    "@workspace/api-zod": "workspace:*",
    "@workspace/db": "workspace:*",
    "bullmq": "^5.74.1",
    "cloudinary": "^2.10.0",       // ALSO in root package.json — duplicate
    "compression": "^1.8.1",
    "cookie-parser": "^1.4.7",
    "cors": "^2",
    "drizzle-orm": "catalog:",
    "express": "^5",
    "ioredis": "^5.10.1",
    "nodemailer": "^8.0.6",        // externalized in build.mjs — won't bundle
    "pino": "^9",
    "pino-http": "^10",
    "sanitize-html": "^2.17.3",
    "sharp": "^0.34.5",            // externalized in build.mjs — requires native addon
    "socket.io": "^4.8.3",
    "stripe": "^22.1.1",
    "web-push": "^3.6.7",
    "zod": "catalog:"
  }
}
```

**⚠️ KNOWN ISSUE:** `ioredis` AND `@upstash/redis` are both installed. The actual `apps/api/src/lib/redis.ts` uses ONLY `@upstash/redis`. `ioredis` is imported in `apps/api/src/lib/queue/queue.ts` (for BullMQ). Both are needed, but `ioredis` is not explicitly listed as a BullMQ peer dep requirement — verify BullMQ v5 bundled `ioredis` or requires it as a peer.

**⚠️ KNOWN ISSUE:** `nodemailer` is externalized in `build.mjs` but is listed as a production dependency. This means it must be present in the deployment environment's `node_modules`. On Railway/Render/Fly.io this works if `NODE_ENV=production` and full `node_modules` are retained. On serverless (Cloudflare Workers) this will fail because externalized CJS modules are not available.

**⚠️ KNOWN ISSUE:** `sharp` is a native binary — externalized in `build.mjs`. This means:
- Must be installed in production `node_modules`
- Must be compiled for the **target platform** (linux-x64 for Railway/Render/Fly)
- Will fail on any platform that installs only the production bundle without running `pnpm install`
- **NOT compatible with Cloudflare Workers**

**⚠️ KNOWN ISSUE (CRITICAL):** `stripe` is installed in the API but there is no `STRIPE_SECRET_KEY` in `apps/api/.env.example`. The Flutterwave keys referenced in your audit template (`FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_ENCRYPTION_KEY`) are also absent from `.env.example`. The `flutterwave.service.ts` file exists but its env vars are undocumented.

### apps/web/package.json — Key Issues

```json
{
  "devDependencies": {
    "react": "catalog:",       // = 19.1.0
    "react-dom": "catalog:",   // = 19.1.0
    "@workspace/api-client-react": "workspace:*"
  }
}
```

**⚠️ KNOWN ISSUE:** `react` and `react-dom` are in `devDependencies`, not `dependencies`. For a Vite SPA this is technically fine (they're bundled at build time) but it is unconventional and may confuse deployment platforms that distinguish dev vs prod installs.

**⚠️ KNOWN ISSUE:** `@workspace/api-client-react` has `"peerDependencies": { "react": ">=18" }` but the workspace pinned React to exactly `19.1.0`. This should be compatible but the peer dep range should be updated to `">=18 || 19"` to be explicit.

### packages/utils/db — Missing `@types/sanitize-html` location

`@types/sanitize-html` is listed in `apps/api/dependencies` (not devDependencies). Type packages should be in `devDependencies` only.

### Missing from apps/api but referenced in code

Check these imports exist:

| Import | File | In package.json? |
|---|---|---|
| `zod/v4` | `apps/api/src/features/uploads/upload.routes.ts` | ⚠️ `zod` v3.25.76 in catalog — `zod/v4` subpath may not exist in v3 |
| `@sentry/node` | `apps/api/src/lib/sentry.ts` | Not listed |
| `resend` | `apps/api/src/features/email/email.service.ts` | Not listed (uses `nodemailer` + `RESEND_API_KEY`) |
| `passport` / `passport-google-oauth20` | `apps/api/src/features/auth/oauth.routes.ts` | Not listed |

**⚠️ CRITICAL:** `zod/v4` subpath — zod version `^3.25.76` uses the old API. The `zod/v4` import path was introduced in zod v4 (a separate major release). If the codebase is mixing `import { z } from "zod"` and `import { z } from "zod/v4"`, this will cause runtime failures.

---

## PHASE 5 — BUILD SYSTEM AUDIT

### apps/api — esbuild via build.mjs

```js
// Actual build config (simplified):
await esbuild({
  entryPoints: ["src/index.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  external: ["sharp", "nodemailer", /* ~60 other externals */],
  sourcemap: "linked",
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire } from 'node:module'; ...` // CJS shim
  }
});
```

**⚠️ KNOWN ISSUE:** Output is `dist/index.mjs` (ESM). The `package.json` start script is `node --enable-source-maps ./dist/index.mjs`. This is correct for Node 18+ but requires the deployment platform to use Node 18+.

**⚠️ KNOWN ISSUE:** `esbuild` version is overridden to `0.27.3` in `pnpm-workspace.yaml`. The `apps/api/package.json` devDependencies specifies `"esbuild": "^0.27.3"`. These should align — they do, but the override affects ALL packages.

**⚠️ KNOWN ISSUE:** `pino-pretty` is a dev dependency in `apps/api` but is referenced as a transport in the build plugin. On production, pino-pretty may not be installed if `NODE_ENV=production` causes `pnpm install --prod`. This can break the pino worker thread at startup.

### apps/web — Vite 7 SPA

```ts
// vite.config.ts key settings:
{
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom"]
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/api": { target: "http://localhost:9000" },  // ← proxied to port 9000
      "/socket.io": { target: "http://localhost:9000", ws: true }
    }
  }
}
```

**⚠️ KNOWN ISSUE:** The API server in `apps/api/src/index.ts` requires `PORT` env var and starts on that port. The Vite dev server proxies `/api` to port 9000, but nothing in the API config sets `PORT=9000`. The `apps/api/package.json` dev script doesn't set `PORT` at all. This is a dev environment mismatch.

**⚠️ KNOWN ISSUE:** `vercel.json` in `apps/web/` rewrites all routes to `index.html`. There is also a `vercel.json` in `apps/web/public/`. Both exist — the one in `public/` would be served as a static file AND the one at root would be used by Vercel. The `public/vercel.json` should be removed or renamed.

```
apps/web/vercel.json         ← Vercel config (correct location)
apps/web/public/vercel.json  ← ALSO exists — this will be served as a static file at /vercel.json
```

### apps/public-web — Next.js 14

```js
// next.config.mjs
const config = {
  output: 'standalone',
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_URL}/api/:path*` }];
  },
};
```

**⚠️ KNOWN ISSUE:** `output: 'standalone'` generates a standalone Node.js server. This is correct for Railway/Render/Fly.io but NOT compatible with Vercel or Netlify static hosting (those need no `output` setting or `output: 'export'` for static).

**⚠️ KNOWN ISSUE:** `API_URL` is not in the Next.js app's `.env.example` (that file doesn't exist). If `API_URL` is not set, the rewrite destination becomes `undefined/api/:path*` which will fail silently.

**⚠️ KNOWN ISSUE:** `apps/public-web` uses React 18 (`^18.3.0`) while the pnpm catalog pins React 19 (`19.1.0`). This creates a **dual React version** situation in the monorepo.

---

## PHASE 6 — DEPLOYMENT AUDIT

### 6.1 Cloudflare Pages (for `apps/web` SPA)

**Build command:** `pnpm --filter @workspace/quillhive build`
**Output directory:** `apps/web/dist`

Blockers:
1. **esbuild platform overrides** — `pnpm-workspace.yaml` excludes all non-linux-x64 esbuild binaries. Cloudflare Pages builds on linux-x64 so this should work, BUT the override format `"-"` (string minus) is non-standard and may be rejected by older pnpm versions.
2. **`minimumReleaseAge: 1440`** — This setting requires pnpm to check package publish dates. Cloudflare's build environment may not support this pnpm config field if it runs an older pnpm version.
3. **`@replit/*` plugins** in catalog — `apps/web` does NOT currently import `@replit/vite-plugin-*`. However, if `vite.config.ts` is ever modified to include them and a deploy runs, the Replit registry packages will not resolve in Cloudflare's environment.
4. **`apps/web/public/vercel.json`** — Will be deployed as a static asset. Not harmful but messy.

### 6.2 Cloudflare Workers (for `apps/api`)

**VERDICT: NOT COMPATIBLE.**

Reasons:
- Uses `sharp` (native binary — not Workers-compatible)
- Uses `pg` (PostgreSQL TCP socket — not Workers-compatible)
- Uses `socket.io` (WebSocket server — requires Durable Objects, not a drop-in)
- Uses `bullmq` + `ioredis` (Redis TCP — not Workers-compatible)
- Uses `express` v5 (Node.js HTTP server — not Workers-compatible)
- Reads filesystem (`fs/promises`, `path.resolve`) — not available in Workers
- Uses `nodemailer` (externalized, requires Node.js runtime)

This API must be deployed to a **Node.js runtime** (Railway, Render, Fly.io, Docker).

### 6.3 Render / Railway / Fly.io (for `apps/api`)

**BLOCKERS:**

1. **`PORT` env var is required and enforced** — `apps/api/src/index.ts` throws if `PORT` is not set:
   ```ts
   if (!rawPort) throw new Error("PORT environment variable is required...");
   ```
   Railway/Render inject `PORT` automatically. ✅ Compatible — but this **must** be documented.

2. **`DATABASE_URL` required at import time** — `packages/utils/db/src/index.ts` throws at module load if `DATABASE_URL` is unset. The API will crash immediately on start if the database is not provisioned before deploy.

3. **`pino-pretty` not in production dependencies** — If deployed with `pnpm install --prod`, pino-pretty will be absent and the pino worker will fail to start. Fix: move `pino-pretty` to `dependencies`, or configure pino to use a different transport in production.

4. **`sharp` requires platform-specific native binary** — Must use `--ignore-scripts=false` and allow native module compilation. On Docker: use `node:20-slim` or `node:20-alpine` with proper build tools. On Railway/Render: should work if platform is linux-x64 and `sharp` installs correctly.

5. **Build artifacts from `packages/utils/db` must exist** — The `dist/` directory is not in the repository. CI builds it, but a fresh deploy without a prior `pnpm --filter @workspace/db build` will fail at typecheck time (though runtime may still work since exports point to `.ts` source files, which `tsx` can handle).

6. **`apps/api` serves `apps/web/dist`** — `app.ts` serves static files from `path.resolve(process.cwd(), "../web/dist")`. In a monorepo Docker deploy or Railway deploy, this relative path must be correct. If only `apps/api` is deployed, this path will not exist and the API will run API-only (which is fine if `apps/web` is deployed separately to Cloudflare Pages).

### 6.4 Vercel (for `apps/web` SPA)

**BLOCKERS:**

1. **Duplicate `vercel.json`** — `apps/web/vercel.json` and `apps/web/public/vercel.json` both exist. The one in `public/` must be deleted.
2. **Root-level build command** — Vercel needs to be configured with `Root Directory: apps/web` or use the `vercel.json` at `apps/web/`. Without this, Vercel will attempt to build from the monorepo root, which will fail because the root `build` script runs typecheck on ALL packages.
3. **pnpm workspace build order** — Vercel must build `@workspace/api-client-react` (and its `@workspace/api-zod` / `@workspace/db` chain) before building `apps/web`. This requires a custom build command:
   ```
   pnpm --filter @workspace/db build && pnpm --filter @workspace/api-client-react build && pnpm --filter @workspace/quillhive build
   ```

### 6.5 Netlify (for `apps/web` SPA)

Same blockers as Vercel. Additionally:
- **`minimumReleaseAge`** — Netlify's pnpm version must support this setting. If not, install will fail.
- **`_redirects` file** — The `vercel.json` rewrite config won't work on Netlify. A `public/_redirects` file is needed:
  ```
  /*  /index.html  200
  ```

### 6.6 Docker (for `apps/api`)

**BLOCKERS:**

1. **Platform overrides exclude non-linux-x64** — The esbuild, rollup, lightningcss, and tailwindcss-oxide overrides in `pnpm-workspace.yaml` use `"-"` to exclude all non-linux-x64 binaries. This ONLY works correctly if Docker builds on linux-x64. ARM-based Docker builds (Apple Silicon, AWS Graviton) will fail.
2. **`autoInstallPeers: false`** — Peer dependencies must be manually managed. Any missed peer dep will not be installed automatically.
3. **`onlyBuiltDependencies`** — Only `@swc/core`, `esbuild`, `msw`, `unrs-resolver` are allowed to run install scripts. `sharp` needs `node-gyp` compile step. It is NOT in `onlyBuiltDependencies` — this means sharp's native build is **blocked** by this setting. Fix: add `sharp` to `onlyBuiltDependencies`.

---

## PHASE 7 — ENVIRONMENT VARIABLES AUDIT

### apps/api — Required Variables

From `.env.example` and code inspection:

| Variable | Required | Present in .env.example | Notes |
|---|---|---|---|
| `PORT` | ✅ CRITICAL | ✅ No (not in .env.example, injected by platform) | Server will not start without it |
| `NODE_ENV` | ✅ | ✅ | Affects rate limiting, JWT secret validation |
| `DATABASE_URL` | ✅ CRITICAL | ✅ | Throws at module load if missing |
| `JWT_SECRET` | ✅ CRITICAL | ✅ | Weak fallback used in dev; production enforces 32+ chars |
| `REFRESH_SECRET` | ✅ | ✅ | Used for refresh tokens |
| `APP_URL` | ✅ | ✅ | CORS origin check fails without it in production |
| `API_URL` | ✅ | ✅ | |
| `RESEND_API_KEY` | ⚠️ Optional | ✅ | Magic links/email won't work without it |
| `CLOUDINARY_CLOUD_NAME` | ⚠️ Optional | ✅ | Falls back to local file storage |
| `CLOUDINARY_API_KEY` | ⚠️ Optional | ✅ | |
| `CLOUDINARY_API_SECRET` | ⚠️ Optional | ✅ | |
| `GOOGLE_CLIENT_ID` | ⚠️ Optional | ✅ | OAuth only |
| `GOOGLE_CLIENT_SECRET` | ⚠️ Optional | ✅ | |
| `GITHUB_CLIENT_ID` | ⚠️ Optional | ✅ | |
| `GITHUB_CLIENT_SECRET` | ⚠️ Optional | ✅ | |
| `ANTHROPIC_API_KEY` | ⚠️ Optional | ✅ | AI features |
| `GEMINI_API_KEY` | ⚠️ Optional | ✅ | AI features |
| `VAPID_PUBLIC_KEY` | ⚠️ Optional | ✅ | Push notifications |
| `VAPID_PRIVATE_KEY` | ⚠️ Optional | ✅ | |
| `REDIS_URL` | ⚠️ Optional | ✅ | BullMQ queues require this |
| `UPSTASH_REDIS_REST_URL` | ⚠️ Optional | ❌ MISSING | Used by `apps/api/src/lib/redis.ts` for Upstash REST client |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ Optional | ❌ MISSING | Used by `apps/api/src/lib/redis.ts` |
| `SENTRY_DSN` | ⚠️ Optional | ✅ | |
| `STRIPE_SECRET_KEY` | ⚠️ Unknown | ❌ MISSING | `stripe` is installed but no env var documented |
| `FLUTTERWAVE_PUBLIC_KEY` | ⚠️ Unknown | ❌ MISSING | `flutterwave.service.ts` exists |
| `FLUTTERWAVE_SECRET_KEY` | ⚠️ Unknown | ❌ MISSING | |
| `FLUTTERWAVE_ENCRYPTION_KEY` | ⚠️ Unknown | ❌ MISSING | |
| `DMCA_EMAIL` | ✅ | ✅ | |
| `APPEALS_EMAIL` | ✅ | ✅ | |
| `OWNER_EMAIL` | ✅ | ✅ | |
| `MAIL_FROM` | ✅ | ✅ | |

### apps/web — Frontend Env Variables

```
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000
VITE_DMCA_EMAIL=dmca@yourdomain.com
VITE_APPEALS_EMAIL=appeals@yourdomain.com
VITE_VAPID_PUBLIC_KEY=
```

✅ All are `VITE_` prefixed — correctly scoped to frontend. No server secrets exposed.

**⚠️ KNOWN ISSUE:** `VITE_API_URL` is the backend API URL. In production, if the SPA and API are on different domains, this must be set to the production API URL at build time (Vite embeds it into the bundle). There is no runtime-safe mechanism to override this post-build.

### apps/public-web — Missing .env.example

**⚠️ CRITICAL:** `apps/public-web` has NO `.env.example` file. It requires `API_URL` (from `next.config.mjs`) to configure the API proxy rewrite target. This is completely undocumented.

---

## PHASE 8 — SECURITY AUDIT

### 8.1 Authentication

```ts
// apps/api/src/lib/auth.ts — password hashing
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}
```

**⚠️ CRITICAL SECURITY ISSUE:** Password hashing uses **SHA-256 + random salt**. This is NOT a password hashing algorithm. SHA-256 is a general-purpose hash function that runs in nanoseconds — it is trivially brute-forceable with a GPU. This must be replaced with `bcrypt`, `argon2`, or `scrypt`. The `argon2` and `bcrypt` packages are even listed as externals in `build.mjs`, suggesting they were considered but never implemented.

```ts
// JWT implementation — custom HMAC, not jose/jsonwebtoken
function sign(header: string, payload: string): string {
  return createHmac("sha256", getJwtSecret()).update(`${header}.${payload}`).digest("base64url");
}
```

**⚠️ KNOWN ISSUE:** Custom JWT implementation. Not necessarily insecure if implemented correctly, but high-risk for subtle bugs (e.g. missing expiry validation, no algorithm verification). Recommend replacing with `jose` or `jsonwebtoken`.

### 8.2 Rate Limiting

```ts
// apps/api/src/middleware/rateLimit.ts
const max = isDev ? baseMax * 10 : baseMax;
// Uses in-memory Map — NOT Redis-backed
const buckets = new Map<string, Bucket>();
```

**⚠️ KNOWN ISSUE:** In-memory rate limiting. On multi-process or multi-instance deploys (e.g. Railway with multiple replicas, or `cluster` mode), each process has its own bucket map. Rate limits will not be enforced across instances. Must use Redis-backed rate limiting (e.g. `express-rate-limit` + `rate-limit-redis`) for production multi-instance deploys.

**⚠️ KNOWN ISSUE:** `getClientIp` trusts `x-forwarded-for` without validation:
```ts
const forwarded = req.headers["x-forwarded-for"];
if (typeof forwarded === "string" && forwarded.length > 0) {
  return forwarded.split(",")[0].trim(); // ← attacker can spoof this
}
```
Attackers can bypass rate limiting by spoofing `x-forwarded-for`. Use `req.socket.remoteAddress` in trusted proxy environments or configure Express `app.set('trust proxy', 1)` and use `req.ip`.

### 8.3 CORS Configuration

```ts
// apps/api/src/app.ts
const allowed =
  (appUrl && origin === appUrl) ||
  /^https?:\/\/[^/]*\.replit\.dev$/.test(origin) ||   // ← Replit-specific, production leak
  /^https?:\/\/[^/]*\.repl\.co$/.test(origin) ||       // ← Replit-specific, production leak
  process.env.NODE_ENV !== "production";                // ← All origins allowed in dev
```

**⚠️ SECURITY ISSUE:** The CORS whitelist includes `*.replit.dev` and `*.repl.co` in ALL environments including production. Any replit subdomain can make credentialed cross-origin requests to the production API. These regex patterns must be removed for production or gated behind `NODE_ENV !== "production"`.

### 8.4 Upload Security

The upload route uses `sharp` for image validation and Cloudinary for CDN. File type validation logic should be verified to ensure it doesn't rely solely on MIME type headers (which can be spoofed). Confirm server-side magic byte validation exists.

### 8.5 Frontend Secret Leaks

All frontend env vars are correctly prefixed with `VITE_`. No server secrets are exposed to the frontend. ✅

---

## PHASE 9 — DEPLOYMENT READINESS REPORT

### Complete Issue List

| # | Severity | Phase | File/Location | Issue |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | Security | `apps/api/src/lib/auth.ts` | SHA-256 password hashing — must use bcrypt/argon2/scrypt |
| 2 | 🔴 CRITICAL | Deps | `apps/api/src/features/uploads/upload.routes.ts` | `import { z } from "zod/v4"` — zod v3.x does not have a `v4` subpath |
| 3 | 🔴 CRITICAL | Deploy | `pnpm-workspace.yaml` | `sharp` not in `onlyBuiltDependencies` — native binary won't compile |
| 4 | 🔴 CRITICAL | Deploy | `pnpm-workspace.yaml` | All non-linux-x64 binary overrides break macOS/Windows/ARM Docker builds |
| 5 | 🔴 CRITICAL | TypeScript | `apps/public-web/tsconfig.json` | `moduleResolution: "bundler"` incompatible with Next.js 14 |
| 6 | 🔴 CRITICAL | React | `apps/public-web/package.json` | React 18 vs catalog React 19 version conflict |
| 7 | 🔴 CRITICAL | Security | `apps/api/src/app.ts` | `*.replit.dev` and `*.repl.co` in CORS whitelist for all environments |
| 8 | 🟠 HIGH | Deploy | `apps/api/src/middleware/rateLimit.ts` | In-memory rate limiting — not multi-instance safe |
| 9 | 🟠 HIGH | Env Vars | `apps/api/.env.example` | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` not documented |
| 10 | 🟠 HIGH | Env Vars | `apps/api/.env.example` | `STRIPE_SECRET_KEY`, `FLUTTERWAVE_*` keys not documented |
| 11 | 🟠 HIGH | Env Vars | `apps/public-web/` | No `.env.example` file — `API_URL` completely undocumented |
| 12 | 🟠 HIGH | Deploy | `apps/api/src/app.ts` | `pino-pretty` in devDependencies but used in production pino worker thread |
| 13 | 🟠 HIGH | TypeScript | `apps/api/tsconfig.json` | `noImplicitAny: false` — hides type errors across entire API codebase |
| 14 | 🟠 HIGH | Monorepo | `packages/utils/db` | `dist/` not in repo — fresh deploys fail without explicit build step |
| 15 | 🟠 HIGH | Build | `apps/web/` | `apps/web/public/vercel.json` conflicts with `apps/web/vercel.json` |
| 16 | 🟡 MEDIUM | TypeScript | `packages/utils/api-zod/src/index.ts` | `./generated/types` resolves to a directory — may fail with some module resolvers |
| 17 | 🟡 MEDIUM | TypeScript | `apps/web/tsconfig.json` | Does not extend `tsconfig.base.json` — inconsistent compiler options |
| 18 | 🟡 MEDIUM | Security | `apps/api/src/middleware/rateLimit.ts` | `x-forwarded-for` trusted without validation — IP spoofable |
| 19 | 🟡 MEDIUM | Deps | Root `package.json` | `cloudinary` in root deps — should only be in `apps/api/dependencies` |
| 20 | 🟡 MEDIUM | Deploy | `apps/public-web/next.config.mjs` | `output: 'standalone'` incompatible with Vercel/Netlify static deployments |
| 21 | 🟡 MEDIUM | Env Vars | `apps/web/` | `VITE_API_URL` baked into bundle at build time — no runtime override possible |
| 22 | 🟡 MEDIUM | TypeScript | `apps/api/tsconfig.json` | Missing `composite: true` — project reference graph incomplete |
| 23 | 🟡 MEDIUM | CI | `.github/workflows/ci.yml` | `@workspace/api-client-react` and `@workspace/api-zod` not built before web typecheck |
| 24 | 🟢 LOW | Monorepo | `pnpm-workspace.yaml` | `apps/public-web` listed twice (redundant glob) |
| 25 | 🟢 LOW | Monorepo | `artifacts/quillhive` | In workspace — should be explicitly excluded from CI builds |
| 26 | 🟢 LOW | Deps | `apps/api/package.json` | `@types/sanitize-html` in `dependencies` — should be `devDependencies` |

---

### Exact Fix Commands

```bash
# 1. Fix sharp in onlyBuiltDependencies (pnpm-workspace.yaml)
# Add to onlyBuiltDependencies section:
#   - sharp

# 2. Fix zod/v4 import — upgrade zod to v4 or fix the import
# Option A: upgrade zod (breaking change)
pnpm --filter @workspace/api-server add zod@4

# Option B: fix the import (use v3 API)
# In upload.routes.ts: change `import { z } from "zod/v4"` to `import { z } from "zod"`

# 3. Fix pino-pretty as a runtime dependency
pnpm --filter @workspace/api-server add pino-pretty

# 4. Fix cloudinary location — remove from root, keep only in apps/api
# Edit root package.json: remove "cloudinary" from dependencies
# Verify it is already in apps/api/package.json (it is)

# 5. Create apps/public-web/.env.example
cat > apps/public-web/.env.example << 'EOF'
API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
EOF

# 6. Fix Next.js tsconfig moduleResolution
# In apps/public-web/tsconfig.json: change "moduleResolution": "bundler" to "moduleResolution": "node"

# 7. Fix React version conflict in public-web
pnpm --filter @quillhive/public-web add react@19.1.0 react-dom@19.1.0

# 8. Fix CORS replit patterns — gate behind NODE_ENV
# In apps/api/src/app.ts, change CORS origin check:
# Remove or gate *.replit.dev and *.repl.co patterns behind process.env.NODE_ENV !== "production"

# 9. Add missing env vars to apps/api/.env.example
cat >> apps/api/.env.example << 'EOF'
# Upstash Redis REST (alternative to REDIS_URL for serverless)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe
STRIPE_SECRET_KEY=

# Flutterwave (payment provider)
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_ENCRYPTION_KEY=
EOF

# 10. Remove duplicate vercel.json from public/
rm apps/web/public/vercel.json

# 11. Add _redirects for Netlify support
echo "/*  /index.html  200" > apps/web/public/_redirects

# 12. Fix @types/sanitize-html location
pnpm --filter @workspace/api-server remove @types/sanitize-html
pnpm --filter @workspace/api-server add -D @types/sanitize-html

# 13. Fix password hashing (CRITICAL SECURITY)
pnpm --filter @workspace/api-server add argon2
# Then update apps/api/src/lib/auth.ts to use argon2.hash() and argon2.verify()
# Remove argon2 from build.mjs externals list

# 14. Build all packages before deploying/typechecking
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/api-client-react build
```

---

### Updated tsconfig Recommendations

**apps/public-web/tsconfig.json** — Fix moduleResolution:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**apps/api/tsconfig.json** — Re-enable strict type checking:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"],
    "noImplicitAny": true,
    "noImplicitReturns": true
  },
  "include": ["src"],
  "exclude": ["src/__tests__"],
  "references": [
    { "path": "../../packages/utils/db" },
    { "path": "../../packages/utils/api-zod" }
  ]
}
```

**Root tsconfig.json** — Add app references:
```json
{
  "extends": "./tsconfig.base.json",
  "compileOnSave": false,
  "files": [],
  "references": [
    { "path": "./packages/utils/db" },
    { "path": "./packages/utils/api-client-react" },
    { "path": "./packages/utils/api-zod" }
  ]
}
```

---

### Updated pnpm-workspace.yaml Recommendations

```yaml
# Add sharp to onlyBuiltDependencies:
onlyBuiltDependencies:
  - '@swc/core'
  - esbuild
  - msw
  - sharp          # ← ADD THIS
  - unrs-resolver

# Remove Replit-specific catalog entries if deploying outside Replit:
# catalog:
#   '@replit/vite-plugin-cartographer': ...  ← remove for non-Replit deploys
#   '@replit/vite-plugin-dev-banner': ...    ← remove for non-Replit deploys
#   '@replit/vite-plugin-runtime-error-modal': ... ← remove for non-Replit deploys
```

---

### CI Fix Recommendation

Update `.github/workflows/ci.yml` to build all packages before typechecking apps:

```yaml
- name: Build internal packages
  run: |
    pnpm --filter @workspace/db build
    pnpm --filter @workspace/api-zod build
    pnpm --filter @workspace/api-client-react build

- run: pnpm --filter @workspace/quillhive typecheck
- run: pnpm --filter @workspace/api-server typecheck
- run: pnpm --filter @quillhive/public-web typecheck  # ← currently missing from CI
```

---

## FINAL VERDICT

```
❌ NOT DEPLOYMENT READY
```

### Summary

QuillHive is a well-architected project with a sophisticated monorepo structure, but it has **26 identified issues** across security, TypeScript, dependencies, and deployment configuration — including **7 critical blockers** that will cause immediate failures:

1. **SHA-256 password hashing** — Critical security vulnerability
2. **`zod/v4` import on zod v3** — Runtime crash in upload routes
3. **`sharp` missing from `onlyBuiltDependencies`** — Native binary won't build on Docker/fresh deploys
4. **Platform-exclusive binary overrides** — Only works on linux-x64; breaks macOS CI, ARM Docker, Cloudflare Pages ARM runners
5. **`moduleResolution: "bundler"` in Next.js app** — `next build` will fail
6. **React 18/19 version split** — Duplicate React instances cause hook errors
7. **Replit CORS patterns in production** — Security exposure

### Remediation Plan

**Priority 1 (Do first — security + build breakers):**
- Fix password hashing to use argon2
- Fix zod/v4 import
- Add sharp to `onlyBuiltDependencies`
- Fix Next.js tsconfig moduleResolution
- Fix React version conflict in public-web
- Remove/gate Replit CORS patterns

**Priority 2 (Deployment configuration):**
- Add missing env vars to .env.example files
- Create `apps/public-web/.env.example`
- Remove `apps/web/public/vercel.json`
- Move pino-pretty to dependencies
- Remove cloudinary from root package.json

**Priority 3 (Type safety + CI):**
- Re-enable `noImplicitAny` in API tsconfig
- Add `composite: true` to API tsconfig
- Fix CI to build packages before typechecking
- Add public-web typecheck to CI

After all Priority 1 and Priority 2 fixes are applied:
```
✅ DEPLOYMENT READY (on Railway/Render/Fly.io for API, Cloudflare Pages/Vercel for web SPA)
```
