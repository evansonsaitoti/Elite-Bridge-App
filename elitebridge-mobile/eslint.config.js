// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "dist-web/*",
      "index.js",
      "app/(user)/**",
      "app/(app)/**",
      "app/(root)/admin/**",
      "app/(root)/user/**",
    ],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);
