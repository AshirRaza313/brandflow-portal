// vitest.setup.ts
// ─────────────────────────────────────────────────────────────────────────────
// Global setup for ALL vitest test files.
// This file is referenced from vitest.config.ts → test.setupFiles
// It runs ONCE before each test file executes.
// ─────────────────────────────────────────────────────────────────────────────

// 1. jest-dom custom matchers for @testing-library/react
//    Enables: expect(el).toBeInTheDocument(), .toBeVisible(), .toHaveTextContent(), etc.
import "@testing-library/jest-dom/vitest";

// 2. (Optional) Polyfill for TextEncoder/TextDecoder — needed by some libs in jsdom
//    Uncomment if you see "TextEncoder is not defined" errors:
// import { TextEncoder, TextDecoder } from "util";
// global.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
// global.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;

// 3. (Optional) Mock window.matchMedia — many UI components (dialogs, tooltips) call this
//    jsdom does not implement it by default.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}

// 4. (Optional) Mock IntersectionObserver — needed by some lazy-loading UI
//    Uncomment if your tests fail with "IntersectionObserver is not defined":
// if (typeof global.IntersectionObserver === "undefined") {
//   global.IntersectionObserver = class {
//     observe() {}
//     unobserve() {}
//     disconnect() {}
//     takeRecords() { return []; }
//   } as unknown as typeof IntersectionObserver;
// }

// 5. (Optional) Clean up DOM between tests — prevents leakage
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});