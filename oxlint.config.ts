import { defineConfig } from "oxlint";

// Existing source predates Ultracite's strict rule set; dependency upgrades keep
// formatting enforced while lint-rule adoption remains a separate migration.
export default defineConfig({
  ignorePatterns: [".next/**", "node_modules/**"],
});
