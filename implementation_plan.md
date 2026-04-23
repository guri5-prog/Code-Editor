# Web-Based Code Editor — Implementation Plan (16 Phases)

> A lightweight, education-focused, web-based code editor that works on low-end devices without installing software. Supports collaborative coding, compiler integrations, auto-saving, and restricted/custom languages.

---

## Architecture Overview

The system follows a monorepo structure with three top-level packages:

```
code-editor/
  packages/
    client/          -- React + Vite SPA (Monaco-based editor)
    server/          -- Node.js + Express API server
    shared/          -- Shared TypeScript types, constants, validation schemas
  docker/            -- Dockerfiles, docker-compose, nginx config
  docs/              -- Architecture docs, ADRs
  .github/           -- CI/CD workflows
```

The monorepo is managed with **npm workspaces**. TypeScript is used throughout. The `shared` package prevents type drift between client and server.

---

## PHASE 1: Project Scaffolding, Tooling, and Dev Environment

### What is being built

The foundational monorepo structure, tooling configuration, and developer experience layer. After this phase, a developer can clone the repo and run `npm install` once to get a working dev environment with hot-reload on both client and server.

### Key files/folders to create

```
code-editor/
  package.json                          -- workspace root, scripts
  tsconfig.base.json                    -- shared TS compiler options
  .gitignore
  .editorconfig
  .prettierrc.json
  eslint.config.js                       -- ESLint 9+ flat config with @typescript-eslint
  .husky/
    pre-commit                          -- runs lint-staged
  lint-staged.config.cjs
  packages/
    shared/
      package.json
      tsconfig.json
      src/
        index.ts
        types/
          user.ts
          project.ts
          editor.ts
        constants/
          languages.ts
          themes.ts
    client/
      package.json
      tsconfig.json
      tsconfig.node.json
      vite.config.ts
      index.html
      public/
        favicon.svg
      src/
        main.tsx
        App.tsx
        vite-env.d.ts
    server/
      package.json
      tsconfig.json
      nodemon.json
      src/
        index.ts
        app.ts
```

### Dependencies to install

**Root (workspace)**:

- `typescript` (devDep)
- `prettier`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` (devDep)
- `husky`, `lint-staged` (devDep)
- `concurrently` (devDep, to run client+server in one command)

**packages/client**:

- `react`, `react-dom`
- `vite`, `@vitejs/plugin-react-swc` (devDep — SWC is faster than Babel on low-end machines)
- `typescript` (devDep)
- `@types/react`, `@types/react-dom` (devDep)

**packages/server**:

- `express`, `cors`, `helmet`, `compression`, `morgan`
- `dotenv`
- `tsx` (devDep — runs TS directly, replaces ts-node for dev)
- `nodemon` (devDep)
- `@types/express`, `@types/cors`, `@types/compression`, `@types/morgan` (devDep)

**packages/shared**:

- `zod` (runtime validation schemas shared by both sides)

### Features delivered

- Running `npm run dev` from root starts both client (port 5173) and server (port 3001) with hot reload
- Client shows a placeholder "Code Editor" page
- Server responds to `GET /api/health` with `{ status: "ok" }`
- Linting and formatting run on every commit via Husky
- TypeScript strict mode everywhere

### Connection to next phase

The client shell and dev server are ready to receive the Monaco editor component. The shared types package establishes the contract for editor-related data structures.

---

## PHASE 2: Core Editor with Monaco

### What is being built

The central editor experience: Monaco Editor integrated into React, with basic multi-language support (syntax highlighting, IntelliSense for JS/TS), a command palette, and keyboard shortcuts.

### Key files/folders to create

```
packages/client/src/
  components/
    Editor/
      Editor.tsx                    -- main Monaco wrapper
      Editor.module.css
      useEditorInstance.ts           -- hook: creates/destroys Monaco model
      editorDefaults.ts              -- default options (minimap off for mobile, etc.)
    Layout/
      AppShell.tsx                   -- top-level layout grid
      AppShell.module.css
  hooks/
    useKeyboardShortcuts.ts
  utils/
    monacoWorkerSetup.ts             -- configure web workers for Monaco
```

### Dependencies to install

**packages/client**:

- `@monaco-editor/react` (wraps monaco-editor with React bindings)
- `monaco-editor` (peer; provides the actual editor + workers)

### Implementation details

1. **Worker setup**: Monaco requires web workers for language services. `vite.config.ts` needs the `monaco-editor/esm/vs/editor/editor.worker` import configured. Use `import.meta.url` worker pattern supported natively by Vite — no extra plugin needed.

2. **Editor component**: Wrap `@monaco-editor/react`'s `Editor` in a custom component that accepts `language`, `value`, `onChange`, `options` props. Store the `IStandaloneCodeEditor` instance in a ref exposed via `useEditorInstance`.

3. **Default options** (in `editorDefaults.ts`): minimap disabled by default (performance), wordWrap on, fontSize 14, scrollBeyondLastLine false, automaticLayout true (responds to container resize).

4. **AppShell layout**: CSS Grid with three regions — header (toolbar), sidebar (hidden initially, prepared for Phase 4), main (editor). The editor fills the remaining viewport height via `height: calc(100vh - var(--header-height))`.

### Features delivered

- Full Monaco editor renders in the browser with syntax highlighting for 20+ languages
- IntelliSense for JavaScript and TypeScript out of the box
- Command palette accessible via Ctrl+Shift+P / Cmd+Shift+P
- Editor auto-resizes on window resize
- Language selector dropdown in the header switches the editor's language mode

### Connection to next phase

The single-editor surface is ready; Phase 3 adds the ability to manage multiple files simultaneously.

---

## PHASE 3: File/Tab Management System

### What is being built

A virtual file system (in-memory, no backend yet) with a tabbed interface. Users can create, rename, delete, and switch between files. Each tab maintains its own undo history and cursor position.

### Key files/folders to create

```
packages/client/src/
  store/
    fileStore.ts                     -- Zustand store for file state
  components/
    Tabs/
      TabBar.tsx
      Tab.tsx
      TabBar.module.css
    Sidebar/
      FileExplorer.tsx
      FileTreeNode.tsx
      FileExplorer.module.css
    Dialogs/
      NewFileDialog.tsx
      RenameFileDialog.tsx
      ConfirmDeleteDialog.tsx
  types/
    file.ts                          -- FileNode, FileTab interfaces
```

### Dependencies to install

**packages/client**:

- `zustand` (lightweight state management — 1.1kB gzipped, ideal for low-end devices)
- `react-hot-toast` (for toast notifications on file operations)
- `nanoid` (tiny unique ID generator for file nodes)

### Implementation details

1. **fileStore** (Zustand): Holds a `Map<string, FileNode>` where each `FileNode` has `{ id, name, language, content, viewState }`. The `viewState` stores Monaco's `ICodeEditorViewState` (cursor position, scroll, selections) so switching tabs restores state perfectly.

2. **Tab management**: Active tab ID tracked in store. Closing a tab activates the nearest sibling. Middle-click closes a tab. Ctrl+Tab cycles tabs. Unsaved indicator (dot) shown per tab.

3. **FileExplorer**: Flat list initially (tree structure added in Phase 12 when projects have real directories). Each entry shows file name + language icon. Right-click context menu for rename/delete.

4. **Monaco model management**: Each file gets its own `monaco.editor.createModel(content, language, uri)`. When switching tabs, the editor's model is swapped via `editor.setModel(model)` and viewState is restored via `editor.restoreViewState(savedViewState)`. Models are disposed on file deletion.

### Features delivered

- Create new files with a name and language
- Tabbed interface with drag-to-reorder (using HTML drag-and-drop, no library needed)
- File explorer sidebar with toggle visibility (Ctrl+B)
- Cursor position, scroll, and undo history preserved per tab
- Unsaved changes indicator
- Keyboard shortcuts: Ctrl+W (close tab), Ctrl+N (new file), Ctrl+Tab (next tab)

### Connection to next phase

The multi-file editor is functional. Phase 4 adds theming so users can customize the visual experience.

---

## PHASE 4: Theming System (Dark/Light/Custom)

### What is being built

A theme engine that applies coherent themes to both the Monaco editor and the surrounding application UI. Ships with dark (default), light, and high-contrast themes. Supports user-created custom themes persisted in localStorage.

### Key files/folders to create

```
packages/client/src/
  themes/
    themeRegistry.ts                 -- registers themes with Monaco and app
    themes.css                       -- CSS custom properties per theme
    dark.ts                          -- Monaco IStandaloneThemeData
    light.ts
    highContrast.ts
  store/
    themeStore.ts                    -- Zustand slice for active theme + custom themes
  components/
    Settings/
      ThemePicker.tsx
      ThemePreview.tsx
```

### Dependencies to install

None new. Monaco's `defineTheme` API and CSS custom properties handle everything.

### Implementation details

1. **Dual-layer theming**: Monaco has its own theming API (`monaco.editor.defineTheme`). The rest of the UI uses CSS custom properties (--bg-primary, --text-primary, --border-color, etc.). The `themeRegistry.ts` module maps a single theme name to both a Monaco theme definition and a CSS class applied to `<body>`.

2. **CSS custom properties** are defined in `themes.css` under `[data-theme="dark"]`, `[data-theme="light"]`, etc. All component CSS references these variables, never hard-coded colors.

3. **Custom themes**: Users pick a base theme and override specific colors. Stored in localStorage via `themeStore`. On load, custom themes are re-registered with Monaco.

4. **System preference detection**: `prefers-color-scheme` media query sets the initial theme. User's explicit choice overrides it.

### Features delivered

- Three built-in themes: Dark (default), Light, High Contrast
- Theme picker in the header with live preview
- All UI components respect the active theme
- Custom theme creator (base + override colors)
- Theme preference persisted across sessions
- Respects OS-level dark/light mode preference on first visit

### Connection to next phase

With theming in place, the visual foundation is complete. Phase 5 extends the editor's language capabilities.

---

## PHASE 5: Advanced Syntax Highlighting and Language Support

### What is being built

Extended language support beyond Monaco's defaults, including custom language definitions for education-specific restricted languages, and enhanced syntax highlighting for popular languages.

### Key files/folders to create

```
packages/client/src/
  languages/
    registry.ts                      -- language registration orchestrator
    restrictedPython.ts              -- example: subset of Python for beginners
    restrictedJS.ts                   -- example: safe JS subset (no eval, no fetch)
    customLanguage.ts                -- template for fully custom DSLs
    snippets/
      python.ts
      javascript.ts
      java.ts
      cpp.ts
  components/
    Editor/
      LanguageSelector.tsx           -- dropdown with search, grouped by category
packages/shared/src/
  types/
    language.ts                      -- LanguageConfig interface
  constants/
    languages.ts                     -- supported language metadata
```

### Dependencies to install

**packages/client** (optional):

- `monaco-textmate` (for TextMate grammar support)
- `monaco-vscode-textmate-theme-converter` (to import VS Code themes)

### Implementation details

1. **Restricted languages** use Monaco's Monarch tokenizer (declarative syntax definition). For "Restricted Python", define a Monarch grammar that tokenizes the allowed subset of keywords. Pair with a custom `CompletionItemProvider` that only suggests allowed constructs (e.g., no `exec`, no `import os`).

2. **Custom language template**: A factory function `defineCustomLanguage({ id, extensions, keywords, operators, tokenizer })` that wraps `monaco.languages.register` + `monaco.languages.setMonarchTokensProvider` + `monaco.languages.registerCompletionItemProvider`.

3. **Snippets**: Registered via `monaco.languages.registerCompletionItemProvider` with `triggerCharacters`. Each language file exports an array of `CompletionItem` objects.

4. **Language metadata** (in shared package): Each language has `{ id, displayName, extensions, category, monacoId, pistonId, icon }`. Categories: "Web", "Systems", "Scripting", "Education", "Custom".

### Features delivered

- Language selector with search and categories
- Restricted Python and Restricted JavaScript modes for education
- Custom snippet sets for Python, JS, Java, C++
- Template for instructors to define their own DSLs
- All language configs exportable from the shared package for server-side validation

### Connection to next phase

Language infrastructure is complete. Phase 6 builds the backend API and authentication so that user data can be persisted.

---

## PHASE 6: Backend API and Authentication

### What is being built

The Express API server with JWT-based authentication, OAuth2 login (Google and GitHub), user registration/login flows, and middleware for authorization, rate limiting, and input validation.

### Key files/folders to create

```
packages/server/src/
  config/
    env.ts                           -- validated env vars with zod
    passport.ts                      -- OAuth strategy setup
  middleware/
    auth.ts                          -- JWT verification middleware
    validate.ts                      -- zod schema validation middleware
    rateLimiter.ts
    errorHandler.ts
  routes/
    auth.routes.ts                   -- /api/auth/*
    user.routes.ts                   -- /api/users/*
  controllers/
    auth.controller.ts
    user.controller.ts
  services/
    auth.service.ts
    token.service.ts
  types/
    express.d.ts                     -- augment Request with user
packages/shared/src/
  schemas/
    auth.ts                          -- loginSchema, registerSchema (zod)
  types/
    user.ts                          -- User, AuthPayload interfaces
```

### Dependencies to install

**packages/server**:

- `jsonwebtoken`, `@types/jsonwebtoken`
- `bcryptjs`, `@types/bcryptjs`
- `passport`, `passport-google-oauth20`, `passport-github2`
- `@types/passport`, `@types/passport-google-oauth20`, `@types/passport-github2`
- `express-rate-limit`
- `cookie-parser`, `@types/cookie-parser`

### Implementation details

1. **Token strategy**: Short-lived access tokens (15 min) in memory/header + long-lived refresh tokens (7 days) in httpOnly secure cookies. Refresh endpoint rotates tokens (refresh token rotation prevents theft).

2. **OAuth flow**: Server-side redirect flow. `/api/auth/google` redirects to Google. Callback at `/api/auth/google/callback` creates or finds user, issues tokens, redirects to client with a one-time code. Client exchanges code for tokens via `/api/auth/token`.

3. **Rate limiting**: 100 req/min for authenticated users, 20 req/min for unauthenticated, 5 req/min for auth endpoints (login/register) per IP.

4. **Validation middleware**: Generic `validate(schema: ZodSchema)` middleware that validates `req.body`, `req.query`, or `req.params` and returns structured 400 errors.

5. **Error handling**: Central `errorHandler` middleware catches all errors, logs them, and returns `{ error: { code, message, details? } }`. In development, includes stack trace.

### Features delivered

- `POST /api/auth/register` — email/password registration with bcrypt
- `POST /api/auth/login` — returns access + refresh tokens
- `POST /api/auth/refresh` — rotates refresh token
- `POST /api/auth/logout` — invalidates refresh token
- `GET /api/auth/google`, `GET /api/auth/github` — OAuth initiation
- `GET /api/users/me` — returns current user profile
- Rate limiting on all endpoints
- Input validation on all mutation endpoints

### Connection to next phase

The auth layer is functional but user data is in memory. Phase 7 connects it to MongoDB and Redis for persistence.

---

## PHASE 7: Database Integration (MongoDB + Redis)

### What is being built

Persistent storage layer: MongoDB for user profiles, projects, and files; Redis for sessions, refresh token blacklist, and rate limit counters. Includes database models, migration scripts, and seeding utilities.

### Key files/folders to create

```
packages/server/src/
  database/
    mongo.ts                         -- connection manager with retry
    redis.ts                         -- ioredis client setup
  models/
    User.model.ts
    Project.model.ts
    File.model.ts
    RefreshToken.model.ts
  repositories/
    user.repository.ts               -- data access layer (decoupled from Mongoose)
    project.repository.ts
    file.repository.ts
  seeds/
    seed.ts                          -- development data seeder
docker/
  docker-compose.dev.yml             -- MongoDB + Redis for local dev
  mongo-init/
    init.js                          -- create DB, indexes, default user
```

### Dependencies to install

**packages/server**:

- `mongoose` (MongoDB ODM)
- `ioredis` (Redis client, better than `redis` for reconnection handling)

### Implementation details

1. **MongoDB schemas**:
   - `User`: `{ email, passwordHash, displayName, avatar, oauthProviders[], settings, createdAt, updatedAt }`. Unique index on email.
   - `Project`: `{ ownerId, name, description, language, isPublic, collaborators[], template?, createdAt, updatedAt }`. Index on ownerId.
   - `File`: `{ projectId, path, content, language, createdAt, updatedAt }`. Compound index on (projectId, path). Content stored as string (for small education files).
   - `RefreshToken`: `{ userId, token, expiresAt, isRevoked }`. TTL index on expiresAt for auto-cleanup.

2. **Redis usage**:
   - Rate limit counters: key `rl:<ip>`, TTL 60s
   - Refresh token blacklist: key `bl:<tokenId>`, TTL matches token expiry
   - Session cache: key `session:<userId>`, stores serialized user object, TTL 15 min
   - Future: collaboration room state (Phase 11)

3. **Repository pattern**: Controllers never import Mongoose models directly. Repositories expose typed async methods (`findByEmail`, `createProject`, `updateFileContent`). This makes testing easy and allows swapping the DB later.

4. **Connection management**: `mongo.ts` uses `mongoose.connect` with `serverSelectionTimeoutMS: 5000` and event listeners for disconnect/reconnect. `redis.ts` uses ioredis with `lazyConnect: true` and exponential backoff retry.

5. **Docker Compose for dev**: MongoDB 7 + Redis 7 containers. Data volumes for persistence across restarts.

### Features delivered

- `docker compose -f docker/docker-compose.dev.yml up` starts MongoDB + Redis
- Auth endpoints now persist users to MongoDB
- Refresh tokens stored in MongoDB with TTL auto-expiry
- Rate limiting backed by Redis (survives server restarts)
- Seed script creates a test user and sample project
- Health endpoint checks DB and Redis connectivity

### Connection to next phase

Data persistence is in place. Phase 8 builds on it by implementing auto-save from the client through the API into MongoDB.

---

## PHASE 8: Auto-Save System

### What is being built

An intelligent auto-save pipeline that debounces editor changes, sends diffs (not full content) to the server, stores versions, and provides visual feedback. Works both online (server-persisted) and offline (localStorage fallback).

### Key files/folders to create

```
packages/client/src/
  services/
    autoSave.ts                      -- debounced save orchestrator
    offlineQueue.ts                  -- queues saves when offline, flushes on reconnect
  store/
    saveStore.ts                     -- save status per file (saving, saved, error, offline)
  components/
    StatusBar/
      StatusBar.tsx
      SaveIndicator.tsx
      ConnectionIndicator.tsx
packages/server/src/
  routes/
    file.routes.ts                   -- /api/projects/:id/files/*
  controllers/
    file.controller.ts
  services/
    file.service.ts
    version.service.ts               -- keeps last N versions per file
  models/
    FileVersion.model.ts
packages/shared/src/
  schemas/
    file.ts                          -- fileSaveSchema, filePatchSchema
```

### Dependencies to install

**packages/client**:

- `diff-match-patch` (Google's library for computing text diffs — much smaller payloads than sending full content)

**packages/server**:

- `diff-match-patch`

### Implementation details

1. **Debounce strategy**: Save triggers 1.5 seconds after the user stops typing (configurable). Additionally, a hard save fires every 30 seconds if there are unsaved changes (safety net). Ctrl+S triggers immediate save.

2. **Diff-based saves**: Client computes a diff-match-patch patch between the last-saved content and current content. Sends `{ fileId, patch, baseVersion }` to `PATCH /api/projects/:pid/files/:fid`. Server applies the patch and increments the version number. If baseVersion mismatches (concurrent edit), server rejects and client re-fetches.

3. **Version history**: `FileVersion` model stores `{ fileId, version, patch, timestamp }`. Keep last 50 versions per file. Users can browse/restore versions (UI in Phase 12).

4. **Offline queue**: `offlineQueue.ts` detects `navigator.onLine` and `online`/`offline` events. When offline, saves go to localStorage under `offline_saves_<fileId>`. On reconnect, queued saves replay in order. Conflicts resolved by last-write-wins with user notification.

5. **Status bar**: Shows at the bottom of the editor. Displays: current line/column, language, encoding, save status ("Saved", "Saving...", "Offline - saved locally", "Error saving"), connection status (green/red dot).

### Features delivered

- Auto-save with debounce (1.5s default, configurable)
- Ctrl+S for manual save
- Diff-based patching (bandwidth-efficient)
- Offline saves with localStorage queue and automatic replay
- Version history storage (last 50 versions per file)
- Status bar with save and connection indicators
- "Last saved X minutes ago" timestamp display

### Connection to next phase

Files can be saved and versioned. Phase 9 adds the ability to actually run the saved code.

---

## PHASE 9: Code Execution/Compilation Engine

### What is being built

A sandboxed code execution system that runs user code securely and streams output back in real-time. Uses the Piston API as the primary backend (supports 70+ languages, no infrastructure needed initially) with a Docker-based fallback for custom/restricted languages.

### Key files/folders to create

```
packages/server/src/
  services/
    execution/
      executor.ts                    -- strategy pattern: picks Piston or Docker
      pistonExecutor.ts              -- Piston API client
      dockerExecutor.ts              -- Docker-based runner (Phase 2 of execution)
      executionQueue.ts              -- Bull queue for rate-limited execution
      sanitizer.ts                   -- input sanitization, size limits
  routes/
    execution.routes.ts              -- POST /api/execute
  controllers/
    execution.controller.ts
  config/
    execution.ts                     -- timeouts, memory limits, allowed languages
packages/client/src/
  components/
    Output/
      OutputPanel.tsx                -- split-pane output display
      OutputPanel.module.css
      OutputToolbar.tsx              -- run button, clear, copy
    Layout/
      SplitPane.tsx                  -- resizable vertical split
  services/
    executionService.ts              -- client-side API calls
  store/
    executionStore.ts                -- output, running state, history
packages/shared/src/
  schemas/
    execution.ts                     -- executeSchema (language, code, stdin, args)
  types/
    execution.ts                     -- ExecutionResult, ExecutionStatus
```

### Dependencies to install

**packages/server**:

- `piston-client` (official Piston API client)
- `bullmq` (job queue for execution requests)
- `dockerode` (Docker API client, for Docker executor)
- `@types/dockerode`

**packages/client**:

- `@xterm/xterm` (terminal emulator for output display)
- `@xterm/addon-fit` (auto-resize terminal to container)

### Implementation details

1. **Execution flow**: Client sends `POST /api/execute { language, code, stdin?, args? }`. Server validates, enqueues in BullMQ (prevents overload), executor picks strategy (Piston for supported languages, Docker for custom). Response streams via Server-Sent Events (SSE) for real-time output.

2. **Piston integration**: `pistonExecutor.ts` calls the Piston public API. For production, self-host Piston via Docker. Timeout: 10 seconds. Memory: 256MB. Each request is independent (stateless).

3. **Security constraints**:
   - Code size limit: 64KB
   - Execution timeout: 10 seconds (configurable per language)
   - Output size limit: 1MB
   - Rate limit: 10 executions per minute per user
   - Restricted language mode: `sanitizer.ts` checks code against a blocklist of forbidden constructs before sending to executor

4. **Output panel**: Uses xterm.js for a realistic terminal experience. Displays stdout in white, stderr in red. Shows execution time and exit code. Supports ANSI color codes from program output.

5. **SplitPane**: Resizable vertical splitter between editor and output. Drag handle. Double-click to collapse/expand. Stores preferred split ratio in localStorage.

### Features delivered

- "Run Code" button (and Ctrl+Enter shortcut) executes current file
- Real-time output streaming via SSE
- Terminal-like output panel with ANSI color support
- Support for Python, JavaScript, TypeScript, Java, C, C++, Go, Rust, Ruby, PHP
- Execution time display and exit code
- stdin input support (prompted before execution)
- Rate limiting and code size validation
- Resizable editor/output split pane

### Connection to next phase

Users can write and run code. Phase 10 enhances the output experience with a full terminal/console panel.

---

## PHASE 10: Terminal/Console Panel and Enhanced Output

### What is being built

An interactive terminal panel that supports multiple output tabs (one per execution), persistent console history, stdin interaction during execution, and a REPL mode for supported languages (Python, Node.js).

### Key files/folders to create

```
packages/client/src/
  components/
    Terminal/
      TerminalPanel.tsx              -- multi-tab terminal container
      TerminalTab.tsx                -- individual xterm instance
      TerminalToolbar.tsx
      ReplMode.tsx                   -- REPL input for interactive languages
    Output/
      OutputHistory.tsx              -- list of past executions
packages/server/src/
  services/
    execution/
      replSession.ts                 -- WebSocket-based REPL sessions
  routes/
    repl.routes.ts                   -- WebSocket upgrade for REPL
```

### Dependencies to install

**packages/client**:

- `@xterm/addon-web-links` (clickable URLs in terminal output)
- `@xterm/addon-search` (search within terminal output)

**packages/server**:

- `node-pty` (pseudo-terminal for REPL sessions — optional, only if Docker executor is enabled)

### Implementation details

1. **Multi-tab terminal**: Each code execution opens a new terminal tab (or reuses existing if re-running same file). Tabs show file name + timestamp. Max 10 tabs; oldest auto-closed.

2. **Interactive stdin**: When execution requires input, the terminal switches to input mode. User types in the terminal and presses Enter. Input is sent via WebSocket to the running process.

3. **REPL mode**: For Python and Node.js, a persistent REPL session runs via WebSocket. User types expressions; output appears immediately. Session state persists until explicitly cleared. Implemented via `replSession.ts` which manages a Docker container per REPL session with a 10-minute inactivity timeout.

4. **Console history**: Past executions stored in `executionStore` (last 50). Each entry: `{ code, language, output, exitCode, duration, timestamp }`. Searchable.

5. **Terminal customization**: Font size (synced with editor), cursor style, scrollback buffer size (1000 lines default). Respects active theme.

### Features delivered

- Multi-tab terminal with one tab per execution
- Interactive stdin during execution
- REPL mode for Python and Node.js
- Execution history panel with search
- Terminal search (Ctrl+F within terminal)
- Clickable URLs in output
- Terminal font/theme follows editor settings
- Clear terminal, copy output, download output as .txt

### Connection to next phase

The single-user experience is now complete (edit, run, see output). Phase 11 makes it multiplayer.

---

## PHASE 11: Real-Time Collaborative Editing

### What is being built

Multi-user real-time collaboration using Y.js (CRDT) for conflict-free concurrent editing, with awareness (cursors, selections, names), a presence panel, and chat. This is the most architecturally complex phase.

### Key files/folders to create

```
packages/server/src/
  collab/
    websocketServer.ts               -- y-websocket server setup
    roomManager.ts                   -- manages Y.js docs per project
    persistence.ts                   -- persists Y.js docs to MongoDB
    awareness.ts                     -- user presence broadcasting
packages/client/src/
  collab/
    collabProvider.ts                -- Y.js WebSocket provider setup
    monacoBinding.ts                 -- binds Y.js doc to Monaco editor
    awarenessManager.ts              -- tracks remote cursors/selections
  components/
    Collab/
      PresencePanel.tsx              -- shows connected users
      RemoteCursor.tsx               -- colored cursor + name label
      CollabToolbar.tsx              -- share link, permission controls
      Chat.tsx                       -- simple real-time chat sidebar
  store/
    collabStore.ts                   -- collaboration state
packages/shared/src/
  types/
    collab.ts                        -- CollabUser, RoomState, Permission
```

### Dependencies to install

**packages/server**:

- `yjs`
- `y-websocket` (WebSocket server adapter for Y.js)
- `y-mongodb-provider` (persists Y.js documents to MongoDB)
- `ws` (WebSocket library used by y-websocket)
- `@types/ws`

**packages/client**:

- `yjs`
- `y-websocket` (WebSocket client)
- `y-monaco` (binds Y.js Text type to Monaco editor model)
- `lib0` (Y.js utility library, peer dependency)

### Implementation details

1. **Y.js architecture**: Each project file maps to a Y.js `Y.Doc` with a single `Y.Text` field. The `y-websocket` server manages document synchronization. When a user opens a file in a shared project, the client connects to `ws://server/collab/<projectId>/<fileId>`.

2. **Monaco binding**: `y-monaco` provides `MonacoBinding` which binds a `Y.Text` to a Monaco editor model. It handles insert/delete operations bidirectionally. Remote changes applied as Monaco edits.

3. **Awareness protocol**: Each client broadcasts `{ userId, displayName, color, cursor: { lineNumber, column }, selection }`. The `awarenessManager.ts` listens for awareness updates and renders colored cursors and selection highlights as Monaco decorations.

4. **Persistence**: `y-mongodb-provider` periodically snapshots Y.js documents to MongoDB (every 30 seconds or on last user disconnect). On room creation, loads the latest snapshot. This ensures data survives server restarts.

5. **Permissions**: Project owner sets collaborator permissions: "edit" (full editing), "view" (read-only, cursor visible but no edits), "execute" (can run code but not edit). Stored in `Project.collaborators[]`.

6. **Share flow**: Owner clicks "Share" and gets a link like `/join/<projectId>/<token>`. Token is a signed JWT with projectId + permission level + expiry. Recipient visits the link, authenticates (or continues as guest), and joins the room.

7. **Chat**: Simple text chat per room. Messages stored in Redis (last 100 per room, TTL 24 hours). Not persisted long-term.

### Features delivered

- Real-time collaborative editing with CRDT (no conflicts)
- Colored remote cursors with user names
- Remote selection highlighting
- Presence panel showing connected users
- Share via link with permission levels (edit/view/execute)
- In-editor chat panel
- Automatic conflict resolution (Y.js CRDT handles all cases)
- Persistence of collaborative state across server restarts

### Connection to next phase

Collaboration is live. Phase 12 builds the user dashboard where users manage their projects and discover shared ones.

---

## PHASE 12: User Dashboard and Project Management

### What is being built

A full project management interface: dashboard showing user's projects, shared projects, recent activity. Project CRUD operations, file tree management, version history browser, and project templates.

### Key files/folders to create

```
packages/client/src/
  pages/
    Dashboard.tsx
    ProjectView.tsx
    ProjectSettings.tsx
    Templates.tsx
  components/
    Dashboard/
      ProjectCard.tsx
      RecentActivity.tsx
      QuickActions.tsx
    Project/
      ProjectHeader.tsx
      FileTree.tsx                   -- full tree with folders, drag-drop
      FileTreeNode.tsx
      VersionHistory.tsx             -- browse/restore file versions
      CollaboratorManager.tsx
    Templates/
      TemplateCard.tsx
      TemplatePreview.tsx
  services/
    projectService.ts
    templateService.ts
packages/server/src/
  routes/
    project.routes.ts
    template.routes.ts
  controllers/
    project.controller.ts
    template.controller.ts
  services/
    project.service.ts
    template.service.ts
  models/
    Template.model.ts
packages/client/src/
  router/
    index.tsx                        -- React Router setup
    ProtectedRoute.tsx
```

### Dependencies to install

**packages/client**:

- `react-router-dom` (client-side routing)
- `@dnd-kit/core`, `@dnd-kit/sortable` (drag-and-drop for file tree and project cards)
- `date-fns` (lightweight date formatting)

### Implementation details

1. **Routing**: `/` (landing/login), `/dashboard` (projects list), `/project/:id` (editor view), `/project/:id/settings`, `/templates`. `ProtectedRoute` redirects unauthenticated users to login.

2. **Dashboard layout**: Grid of project cards showing name, language, last modified, collaborator count. Filter by: owned, shared with me, public. Sort by: recent, name, language. Search by name.

3. **File tree**: Now supports nested directories. Drag-and-drop for reorganizing files and folders. Context menu: new file, new folder, rename, delete, duplicate. Tree state persisted in the project.

4. **Version history**: Timeline view per file showing all saved versions. Click to preview, click "Restore" to revert. Diff view between any two versions.

5. **Templates**: Pre-built project templates — "Hello World (Python)", "Web Page (HTML/CSS/JS)", "Data Structures (Java)", "Algorithm Practice (C++)", "Blank Project". Each template includes starter files and a README. Instructors can create custom templates.

6. **Project settings page**: Rename, change description, toggle public/private, manage collaborators (add by email, change permission, remove), delete project (with confirmation).

### Features delivered

- User dashboard with project grid
- Create/rename/delete projects
- Full file/folder tree with drag-and-drop
- Version history browser with diff view and restore
- Project templates (5 built-in + custom)
- Collaborator management UI
- Client-side routing with protected routes
- Search and filter projects

### Connection to next phase

The full project management layer is done. Phase 13 adds education-specific features.

---

## PHASE 13: Education Features

### What is being built

Features specifically for educational use: guided coding exercises with test cases, instructor-defined language restrictions, code submission and grading, exercise templates, and a classroom mode.

### Key files/folders to create

```
packages/client/src/
  components/
    Education/
      ExercisePanel.tsx              -- exercise description + test cases sidebar
      TestResults.tsx                -- pass/fail display per test case
      HintSystem.tsx                 -- progressive hints
      ExerciseTimer.tsx
      SubmissionStatus.tsx
    Classroom/
      ClassroomDashboard.tsx         -- instructor view: student progress
      StudentProgress.tsx
      CodeReview.tsx                  -- instructor can annotate student code
packages/server/src/
  routes/
    exercise.routes.ts
    classroom.routes.ts
    submission.routes.ts
  controllers/
    exercise.controller.ts
    classroom.controller.ts
    submission.controller.ts
  services/
    exercise.service.ts
    grading.service.ts               -- runs test cases against submissions
    classroom.service.ts
  models/
    Exercise.model.ts
    Submission.model.ts
    Classroom.model.ts
packages/shared/src/
  types/
    exercise.ts
    classroom.ts
    submission.ts
  schemas/
    exercise.ts
    submission.ts
```

### Dependencies to install

**packages/server**:

- `cron` (scheduled grading jobs, e.g., batch grading after deadline)

### Implementation details

1. **Exercise model**: `{ title, description (markdown), language, restrictedLanguageId?, starterCode, testCases[], hints[], difficulty, tags, createdBy }`. Test cases: `{ input, expectedOutput, isHidden, points }`.

2. **Grading service**: Runs student code against each test case via the execution engine (Phase 9). Compares stdout with expectedOutput (exact match, or regex match for flexible grading). Hidden test cases prevent hardcoding answers.

3. **Restricted language enforcement**: When an exercise specifies a `restrictedLanguageId`, the editor loads that restricted language mode (from Phase 5). The execution sanitizer also validates the code server-side against the restriction rules before execution.

4. **Hint system**: Progressive hints stored per exercise. First hint free, subsequent hints cost points (configurable). Hints revealed one at a time with a "Show next hint" button.

5. **Classroom model**: `{ name, instructorId, studentIds[], exerciseIds[], settings }`. Instructor creates a classroom, adds exercises, and shares a join code with students. Dashboard shows real-time student progress (who's working, who's submitted, pass rates per exercise).

6. **Code review**: Instructor can open any student's submission, add inline comments (stored as annotations with line number + text), and send feedback. Student sees annotations in their editor.

7. **Exercise timer**: Optional per-exercise time limit. Timer displayed in the header. Auto-submits when time expires.

### Features delivered

- Exercise creation and management for instructors
- Student exercise view with description, starter code, and test cases
- Automated grading with visible and hidden test cases
- Progressive hint system
- Classroom management (create class, add students via join code)
- Instructor dashboard with real-time student progress
- Code review with inline annotations
- Exercise timer with auto-submit
- Restricted language enforcement in exercises

### Connection to next phase

Education features are complete. Phase 14 adds user settings, preferences, and accessibility features.

---

## PHASE 14: Settings, Preferences, and Accessibility

### What is being built

A comprehensive settings system (persisted server-side for logged-in users, localStorage for guests), accessibility features meeting WCAG 2.1 AA, and responsive/mobile design.

### Key files/folders to create

```
packages/client/src/
  pages/
    Settings.tsx
  components/
    Settings/
      GeneralSettings.tsx            -- language, font size, tab size
      EditorSettings.tsx             -- wordwrap, minimap, bracket pairs
      KeybindingsSettings.tsx        -- customizable keyboard shortcuts
      AccessibilitySettings.tsx      -- screen reader, reduced motion, focus
    A11y/
      SkipLinks.tsx
      FocusTrap.tsx
      ScreenReaderAnnouncer.tsx       -- aria-live region for announcements
  hooks/
    useSettings.ts                    -- reads/writes settings
    useMediaQuery.ts
    useReducedMotion.ts
    useFocusManagement.ts
  styles/
    responsive.css                    -- breakpoint-based layout adjustments
    a11y.css                          -- focus styles, high contrast overrides
packages/server/src/
  routes/
    settings.routes.ts
  controllers/
    settings.controller.ts
  services/
    settings.service.ts
packages/shared/src/
  types/
    settings.ts                      -- UserSettings interface
  schemas/
    settings.ts                      -- settingsSchema (zod)
  constants/
    defaults.ts                      -- default settings values
```

### Dependencies to install

None new. Built with native React, CSS, and ARIA attributes.

### Implementation details

1. **Settings architecture**: `UserSettings` is a flat object with sections: `{ editor: { fontSize, tabSize, wordWrap, minimap, ... }, theme: { activeTheme, customThemes }, keybindings: { run, save, newFile, ... }, accessibility: { screenReaderMode, reducedMotion, highContrast, focusIndicators } }`. Defaults in shared package. User overrides merged on top.

2. **Persistence**: For authenticated users, settings saved to `User.settings` in MongoDB via `PUT /api/users/me/settings`. For guests, localStorage. `useSettings` hook abstracts this.

3. **Accessibility features**:
   - **Skip links**: "Skip to editor", "Skip to output", "Skip to navigation" links visible on Tab focus
   - **Screen reader mode**: Adds aria-labels to all interactive elements, announces editor state changes via aria-live region
   - **Keyboard navigation**: Every feature accessible via keyboard. Focus trapping in modals/dialogs. Visible focus indicators
   - **Reduced motion**: `prefers-reduced-motion` media query disables all animations. Also available as a manual toggle
   - **High contrast mode**: Increases border widths, adds underlines to links, uses pattern fills instead of color-only indicators
   - **Font scaling**: Editor and UI font sizes independently adjustable. Minimum 12px, maximum 32px

4. **Responsive design**:
   - **Desktop (>1024px)**: Full layout — sidebar + editor + output side by side
   - **Tablet (768-1024px)**: Sidebar collapses to icons-only. Output panel moves to a bottom sheet
   - **Mobile (<768px)**: Single-panel view. Swipe navigation between file explorer, editor, and output. Bottom navigation bar. Monaco works on mobile with touch-optimized settings

5. **Custom keybindings**: Users can rebind any keyboard shortcut. Stored in settings. Conflict detection warns if a binding conflicts with Monaco's built-in shortcuts.

### Features delivered

- Settings page with organized sections
- All settings persisted (server for users, localStorage for guests)
- WCAG 2.1 AA compliance (skip links, ARIA labels, focus management, color contrast)
- Screen reader support with live announcements
- Reduced motion mode
- Fully keyboard-navigable interface
- Responsive layout for desktop, tablet, and mobile
- Custom keyboard shortcut bindings
- Font size controls for editor and UI independently

### Connection to next phase

The app is feature-complete and accessible. Phase 15 optimizes performance for low-end devices.

---

## PHASE 15: Performance Optimization for Low-End Devices

### What is being built

Systematic performance optimization targeting devices with 2GB RAM and slow 3G connections: bundle splitting, lazy loading, worker offloading, memory management, and runtime performance monitoring.

### Key files/folders to create

```
packages/client/
  vite.config.ts                     -- updated with chunk splitting config
  src/
    workers/
      diffWorker.ts                  -- offload diff computation to Web Worker
      syntaxWorker.ts                -- offload custom syntax validation
    utils/
      performance.ts                 -- performance monitoring utilities
      memoryManager.ts               -- dispose unused Monaco models
      lazyImports.ts                 -- lazy component wrappers
    components/
      Performance/
        PerformanceOverlay.tsx        -- dev-only FPS/memory display
```

### Dependencies to install

**packages/client**:

- `web-vitals` (Core Web Vitals measurement)
- `comlink` (makes Web Worker communication promise-based — 1.5KB)

### Implementation details

1. **Bundle splitting strategy** (in `vite.config.ts`):
   - Monaco editor: separate chunk (loaded after shell renders)
   - xterm.js: separate chunk (loaded when terminal first opened)
   - Y.js + collab: separate chunk (loaded only when joining a shared project)
   - Education components: separate chunk
   - Each route lazy-loaded via `React.lazy()`
   - Target: initial bundle under 150KB gzipped. Monaco chunk ~800KB (unavoidable but deferred)

2. **Monaco optimization**:
   - Load only the languages the user actually uses
   - Disable features on low-end devices: no minimap, no parameter hints, no hover, reduced suggestion list (5 items instead of 12), no bracket pair colorization
   - `memoryManager.ts`: Dispose Monaco models for files not open in any tab. Track model count; if >20, dispose least-recently-used

3. **Web Workers**: Move diff-match-patch computation and custom syntax validation off the main thread. Use Comlink for ergonomic async communication.

4. **Low-end device detection**: Check `navigator.hardwareConcurrency` (core count), `navigator.deviceMemory` (RAM in GB), and `navigator.connection.effectiveType` (connection speed). If any indicates low-end (<=2 cores, <=2GB RAM, or "slow-2g"/"2g"), automatically enable "Lite Mode".

5. **Image/asset optimization**: All icons as inline SVGs (no HTTP requests). No images in the core editor. Fonts loaded with `font-display: swap`.

6. **Service Worker precaching**: Cache Monaco worker files and editor chunks after first load so subsequent visits are instant.

7. **Memory leak prevention**: Audit all `useEffect` cleanup functions. Monaco editor instances `.dispose()` on unmount. Y.js documents `.destroy()` on disconnect. xterm instances `.dispose()` on close.

8. **Runtime monitoring**: `performance.ts` measures: time-to-interactive, first-contentful-paint, Monaco ready time, execution round-trip time.

### Features delivered

- Initial load under 150KB gzipped (before Monaco)
- Monaco loads asynchronously after shell render
- "Lite Mode" auto-enabled on low-end devices (also manually togglable)
- Web Workers for heavy computation (no main-thread blocking)
- Lazy loading for all routes and heavy components
- No memory leaks (verified disposal of all resources)
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1 on 3G
- Performance monitoring overlay (dev mode)

### Connection to next phase

The app is fast. Phase 16 adds testing, CI/CD, PWA support, deployment, and the plugin system.

---

## PHASE 16: Testing, CI/CD, PWA, Deployment, and Plugin System

### What is being built

This final phase covers five remaining areas that bring the project to production quality: comprehensive testing, continuous integration/deployment, PWA offline support, Docker-based deployment, and an extension/plugin system.

### Key files/folders to create

```
# Testing
packages/client/
  vitest.config.ts
  src/__tests__/
    components/
      Editor.test.tsx
      TabBar.test.tsx
      FileExplorer.test.tsx
    store/
      fileStore.test.ts
      executionStore.test.ts
    services/
      autoSave.test.ts
    integration/
      editorFlow.test.tsx
packages/server/
  vitest.config.ts
  src/__tests__/
    routes/
      auth.test.ts
      execution.test.ts
      project.test.ts
    services/
      grading.test.ts
      file.test.ts
    integration/
      authFlow.test.ts
e2e/
  playwright.config.ts
  tests/
    auth.spec.ts
    editor.spec.ts
    collaboration.spec.ts
    exercise.spec.ts

# CI/CD
.github/
  workflows/
    ci.yml                           -- lint, test, build on PR
    deploy.yml                       -- deploy on merge to main
    e2e.yml                          -- nightly e2e tests

# PWA
packages/client/
  src/sw/
    serviceWorker.ts
  public/
    manifest.json
    icons/
      icon-192.png
      icon-512.png

# Deployment
docker/
  Dockerfile.client                  -- multi-stage: build + nginx
  Dockerfile.server                  -- multi-stage: build + node slim
  docker-compose.prod.yml           -- full stack
  nginx/
    nginx.conf                       -- reverse proxy, SSL, gzip
  monitoring/
    prometheus.yml
    grafana-dashboard.json

# Plugin System
packages/client/src/
  plugins/
    pluginManager.ts                 -- loads, validates, sandboxes plugins
    pluginAPI.ts                     -- API exposed to plugins
    pluginSandbox.ts                 -- iframe-based sandboxing
    types.ts                         -- PluginManifest, PluginAPI interfaces
  components/
    Plugins/
      PluginMarketplace.tsx
      PluginSettings.tsx
      InstalledPlugins.tsx
```

### Dependencies to install

**Testing (devDeps)**:

- `vitest` (test runner, Vite-native)
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- `jsdom` (for vitest DOM environment)
- `msw` (Mock Service Worker — intercepts HTTP for integration tests)
- `@playwright/test` (e2e testing)

**packages/client**:

- `vite-plugin-pwa` (generates service worker and manifest)
- `workbox-precaching`, `workbox-routing`, `workbox-strategies` (service worker runtime)

### Implementation details

**Testing strategy**:

1. **Unit tests** (Vitest): Test stores, services, and utility functions in isolation. For React components, use Testing Library with jsdom. Mock Monaco editor. Target: 80% line coverage on non-UI code.

2. **Integration tests** (Vitest + MSW): Mount full component trees, intercept API calls with MSW, and verify end-to-end flows within the browser environment.

3. **E2E tests** (Playwright): Test critical user journeys in real browsers: sign up, create project, write code, run it, share project, collaborate, submit exercise. Run against a Docker Compose stack.

**CI/CD pipelines** (GitHub Actions):

4. **ci.yml** (on every PR): Lint, type check, unit + integration tests with coverage, build client + server, upload artifacts, comment coverage diff on PR.

5. **deploy.yml** (on merge to main): Build Docker images, push to GitHub Container Registry, deploy via SSH, run smoke tests, notify on success/failure.

6. **e2e.yml** (nightly): Spin up Docker Compose stack, run full Playwright suite, upload reports on failure.

**PWA support**:

7. Cache strategy: "stale-while-revalidate" for API responses, "cache-first" for static assets. App shell precached for instant offline loading.

8. Offline: Editor works fully offline (files in localStorage). Code execution shows "Offline" message. PWA install prompt after 3rd visit.

**Deployment**:

9. **Client Dockerfile**: Multi-stage — node:20-alpine builds, nginx:alpine serves. Final image ~25MB.

10. **Server Dockerfile**: Multi-stage — builds TS, runs with production node_modules only. Final image ~150MB.

11. **nginx.conf**: Reverse proxy `/api/*` and `/ws/*` to server. Gzip compression. SSL termination. Cache headers (1 year for hashed assets, no-cache for index.html).

12. **Monitoring**: Prometheus scrapes `/api/metrics`. Grafana dashboard for visualization. Health check at `/api/health`.

**Plugin system**:

13. **Plugin manifest**: `{ name, version, description, permissions: ["editor.read", "editor.write", "execution.run", ...], entryPoint }`.

14. **Sandboxing**: Plugins run in an iframe with restricted `postMessage` API. Cannot access DOM, cookies, or make network requests without permission.

15. **Built-in plugins**: "Code Formatter" (Prettier), "Markdown Preview", "Code Timer" (education tracking).

16. **Plugin marketplace UI**: Browse, install/uninstall, enable/disable. View permissions before installing.

### Features delivered

- 80%+ test coverage on business logic
- Unit, integration, and E2E test suites
- CI pipeline on every PR
- CD pipeline on merge to main
- Nightly E2E runs
- PWA: installable, offline editing, fast repeat visits
- Docker Compose production stack with nginx, SSL, gzip
- Prometheus + Grafana monitoring
- Plugin system with iframe sandboxing
- 3 built-in plugins
- Plugin marketplace UI

---

## Phase Dependency Graph

```
Phase 1 (Scaffolding)
  │
Phase 2 (Monaco Editor)
  │
Phase 3 (File/Tab Management)
  │
Phase 4 (Theming) ────┐
  │                    │
Phase 5 (Languages) ───┘  (Phases 4 & 5 can be parallelized)
  │
Phase 6 (Auth API)
  │
Phase 7 (Database)
  │
Phase 8 (Auto-Save)
  │
Phase 9 (Code Execution)
  │
Phase 10 (Terminal)
  │
Phase 11 (Collaboration)
  │
Phase 12 (Dashboard/Projects)
  │
Phase 13 (Education)
  │
Phase 14 (Settings/A11y/Responsive)
  │
Phase 15 (Performance)
  │
Phase 16 (Testing/CI/CD/PWA/Deploy/Plugins)
```

---

## Key Technical Decisions

| Decision                                    | Rationale                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Zustand over Redux**                      | 1.1KB vs 7KB. Every kilobyte matters for low-end devices. Simpler API, no boilerplate.                  |
| **Y.js over OT**                            | CRDTs are fundamentally conflict-free. No server-side transform logic. Battle-tested (Notion, Jupyter). |
| **Piston API over custom Docker execution** | 70+ languages out of the box. Handles sandboxing, timeouts, resource limits. Self-hostable.             |
| **SWC over Babel in Vite**                  | 20x faster compilation. Sub-second hot reloads on low-end machines.                                     |
| **Repository pattern**                      | Enables unit testing without a database. Makes DB swapping possible later. Keeps controllers thin.      |
| **iframe-based plugin sandbox**             | True process isolation. Malicious plugins cannot access main app memory, DOM, or cookies.               |

---

## Estimated Timeline

| Phase                                | Duration | Cumulative  |
| ------------------------------------ | -------- | ----------- |
| 1. Scaffolding                       | 2 days   | 2 days      |
| 2. Monaco Editor                     | 3 days   | 5 days      |
| 3. File/Tab Management               | 3 days   | 8 days      |
| 4. Theming                           | 2 days   | 10 days     |
| 5. Languages                         | 3 days   | 13 days     |
| 6. Auth API                          | 4 days   | 17 days     |
| 7. Database                          | 3 days   | 20 days     |
| 8. Auto-Save                         | 3 days   | 23 days     |
| 9. Code Execution                    | 5 days   | 28 days     |
| 10. Terminal                         | 3 days   | 31 days     |
| 11. Collaboration                    | 7 days   | 38 days     |
| 12. Dashboard/Projects               | 5 days   | 43 days     |
| 13. Education                        | 6 days   | 49 days     |
| 14. Settings/A11y                    | 4 days   | 53 days     |
| 15. Performance                      | 3 days   | 56 days     |
| 16. Testing/CI/CD/PWA/Deploy/Plugins | 10 days  | **66 days** |

**Total: ~66 working days (13-14 weeks) for a single developer.**

---

## Testing Strategy: Test-As-You-Go

> **Important:** While Phase 16 sets up the full test infrastructure (Vitest config, Playwright, CI pipelines), unit tests should be written alongside each phase starting from Phase 3. Every new store, service, and utility function should have a co-located `.test.ts` file. This prevents 15 phases of untested code from accumulating. Phase 16 then focuses on integration tests, E2E tests, CI/CD wiring, and the remaining deliverables (PWA, deployment, plugins).

**Per-phase testing baseline:**

- Phases 1-2: Manual verification only (scaffolding + editor rendering)
- Phases 3-5: Unit tests for stores (`fileStore.test.ts`), utilities, and language configs
- Phases 6-8: Unit tests for controllers, services, middleware, repositories
- Phases 9-10: Unit tests for execution service, sanitizer, queue logic
- Phases 11-13: Unit tests for collab logic, grading service, classroom service
- Phases 14-15: Unit tests for settings hooks, performance utilities
- Phase 16: Test infrastructure setup, integration tests, E2E tests, CI/CD

---

## Verification Plan

After each phase, verify by:

1. `npm run dev` — both client and server start without errors
2. Manual testing of all features listed in "Features delivered"
3. `npm run lint && npm run typecheck` — no lint or type errors
4. Run any unit tests written for that phase: `npm test`
5. After Phase 16: Full `npm test` passes, `npm run e2e` passes, Docker build succeeds
