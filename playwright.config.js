import { defineConfig, devices } from '@playwright/test';

// Runs only against the Firebase Local Emulator Suite — never the live
// project. See package.json's "e2e" script, which wraps the whole
// `playwright test` invocation in `firebase emulators:exec --only
// auth,firestore`, so the emulators are already up (and get torn down
// afterward) by the time this config's webServer/globalSetup run.
const PORT = 5173;

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global-setup.js',
    // Every spec shares the same two seeded users and emulator state —
    // running serially keeps them from stepping on each other, which
    // matters far more here than parallel speed for a ~10-test suite.
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: 'list',
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
    },
    // Boots the real app via the real Vite dev server.
    //
    // --host 127.0.0.1 is load-bearing, not cosmetic: Vite's default host
    // binds to "localhost", which on this machine's Node/Windows DNS
    // resolution resolves to the IPv6 loopback (::1) — NOT 127.0.0.1. That
    // silently left the server unreachable at the literal 127.0.0.1 address
    // `url`/baseURL poll below, which is what actually produced "Timed out
    // waiting 60000ms from config.webServer" (Vite itself was up the whole
    // time — curling ::1 or "localhost" would have worked). Pinning both
    // sides to the same literal 127.0.0.1 removes the ambiguity.
    //
    // --mode e2e makes Vite load .env.e2e (see that file's own comment)
    // instead of trying to inject VITE_USE_EMULATOR/VITE_FIREBASE_* as
    // process env vars through this command. That was the first approach
    // here, via a cross-env-wrapped command + Playwright's webServer.env —
    // it turned out NOT to reliably win over the real .env file across the
    // npx/cross-env/Playwright spawn chain on this machine (verified: the
    // app was still calling the real Firebase project's Identity Toolkit
    // endpoint with the real API key from .env, not the emulator's fake
    // one, which is what actually caused every sign-in in the suite to 400
    // and every `waitForURL(/\/chat/)` to time out). A Vite mode file is
    // the deterministic, Vite-native way to guarantee this instead of
    // fighting environment-variable precedence through several layers of
    // process spawning. cross-env is still a devDependency for the day
    // this command needs an inline env var again, but isn't in the
    // critical path of this fix.
    webServer: {
        command: `npx vite --port ${PORT} --strictPort --host 127.0.0.1 --mode e2e`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        // Vite's own cold start is fast, but this also has to wait behind
        // the Firestore/Auth emulators finishing their own boot (the outer
        // `firebase emulators:exec` in package.json's "e2e" script) — 60s
        // cut it close under load, 120s gives real headroom.
        timeout: 120_000,
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
