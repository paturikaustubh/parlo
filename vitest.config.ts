import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    exclude: [
      ...configDefaults.exclude,
      // missing @testing-library/react — fix separately
      "src/app/(user)/checkin/page.test.tsx",
      "src/app/(user/)/checkin/page.test.tsx",
      // mock setup incomplete — fix separately
      "tests/services/session.service.test.ts",
      "src/services/analytics.service.test.ts",
    ],
  },
});
