import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appDir = path.join(root, "app");
const appConfig = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
const files = fs.readdirSync(appDir).filter((name) => name.endsWith(".tsx"));
const source = files.map((name) => fs.readFileSync(path.join(appDir, name), "utf8")).join("\n");
const failures = [];

const expectedRoutes = ["index.tsx", "sign-in.tsx", "register.tsx", "dashboard.tsx", "shifts.tsx", "post-shift.tsx", "applications.tsx", "account.tsx"];
for (const route of expectedRoutes) if (!files.includes(route)) failures.push(`Missing declared route: ${route}`);
const unexpectedRoutes = files.filter((route) => !expectedRoutes.includes(route) && route !== "_layout.tsx");
if (unexpectedRoutes.length) failures.push(`Unexpected route files: ${unexpectedRoutes.join(", ")}`);
if (files.some((name) => /demo|reviewer|hidden|dev/i.test(name))) failures.push("A route filename suggests concealed or reviewer-specific behavior.");
if (/__DEV__|reviewer@|appreview|secret tap|remote.?flag/i.test(source)) failures.push("Source contains a prohibited review-specific or hidden activation pattern.");
if (/mock shift|sample caregiver|demo session/i.test(source)) failures.push("Source contains local sample-data behavior.");
if (!source.includes("Create employer account")) failures.push("Public employer registration is not visible.");
if (!source.includes("Elite Bridge Caregiver")) failures.push("Companion Caregiver app relationship is not disclosed.");
if (!source.includes("Delete account")) failures.push("In-app account deletion is missing.");
if (appConfig.expo.ios.bundleIdentifier !== "com.app.elitebridgeemployer") failures.push("Employer bundle identifier changed.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Release audit passed: ${expectedRoutes.length} explicit routes, employer-only onboarding, companion-app disclosure, no demo or review-specific activation paths.`);
