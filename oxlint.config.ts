import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

// Ultracite's full rule set, enabled. Anything a linter can decide
// deterministically belongs here rather than in AGENTS.md, where a written
// rule decays under context pressure and an exit code does not.
export default defineConfig({
  ...core,
  ...react,
  ...next,
  ignorePatterns: [".next/**", "node_modules/**"],
});
