import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appDir = path.join(root, "app");
const appConfig = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
const files = fs.readdirSync(appDir).filter((name) => name.endsWith(".tsx"));
const sourceRoots = [appDir, path.join(root, "lib"), path.join(root, "components")];
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : /\.(?:ts|tsx)$/.test(entry.name) ? [path.join(directory, entry.name)] : []);
const source = sourceRoots.flatMap(walk).map((name) => fs.readFileSync(name, "utf8")).join("\n");
const failures = [];

const expectedRoutes = ["index.tsx", "sign-in.tsx", "register.tsx", "dashboard.tsx", "shifts.tsx", "post-shift.tsx", "applications.tsx", "account.tsx", "profile.tsx", "notifications.tsx"];
for (const route of expectedRoutes) if (!files.includes(route)) failures.push(`Missing declared route: ${route}`);
const unexpectedRoutes = files.filter((route) => !expectedRoutes.includes(route) && route !== "_layout.tsx");
if (unexpectedRoutes.length) failures.push(`Unexpected route files: ${unexpectedRoutes.join(", ")}`);
if (files.some((name) => /demo|reviewer|hidden|dev/i.test(name))) failures.push("A route filename suggests concealed or reviewer-specific behavior.");
if (/__DEV__|reviewer@|appreview|secret tap|remote.?flag/i.test(source)) failures.push("Source contains a prohibited review-specific or hidden activation pattern.");
if (/mock shift|sample caregiver|demo session/i.test(source)) failures.push("Source contains local sample-data behavior.");
if (!source.includes("Create employer account")) failures.push("Public employer registration is not visible.");
if (!source.includes("Elite Bridge Caregiver")) failures.push("Companion Caregiver app relationship is not disclosed.");
if (!source.includes("Delete account")) failures.push("In-app account deletion is missing.");
if (!source.includes("Sign out")) failures.push("Visible sign-out control is missing.");
if (!source.includes("Privacy Policy")) failures.push("Visible Privacy Policy access is missing.");
if (!source.includes("Organization profile")) failures.push("Editable organization profile is missing.");
if (!source.includes("Instant claim")) failures.push("Instant matched-shift assignment mode is missing.");
if (!source.includes("Review first")) failures.push("Employer-approval assignment mode is missing.");
if (!source.includes("Push notification settings")) failures.push("Push notification settings access is missing.");
if (appConfig.expo.ios.bundleIdentifier !== "com.app.elitebridgeemployer") failures.push("Employer bundle identifier changed.");
if (appConfig.expo.version !== "1.2.0") failures.push("Employer release version must be 1.2.0.");
if (appConfig.expo.ios.buildNumber !== "24") failures.push("Employer iOS build number must be 24.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Release audit passed: ${expectedRoutes.length} explicit routes, visible account controls, live organization profile, dual shift-assignment modes, companion-app disclosure, and no demo or review-specific activation paths.`);
