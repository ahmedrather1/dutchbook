import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so RTL's own auto-cleanup never registers and the DOM
// leaks between tests. Without this, counts from earlier tests show up in later ones.
afterEach(cleanup);
