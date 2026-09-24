import { defineConfig } from 'vite';

// Separate from vite.config.js's main `test` block on purpose: this suite
// talks to a real Firestore emulator (see package.json's "test:rules"
// script), so it must never be swept up by a plain `npm test`, and it needs
// no jsdom/setupFiles — it's pure Node talking to a local gRPC/HTTP emulator.
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['firestore.rules.test.js'],
        hookTimeout: 30000,
        testTimeout: 30000,
    },
});
