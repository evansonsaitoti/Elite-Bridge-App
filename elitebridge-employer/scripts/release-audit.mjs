import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appDir = path.join(root, "app");
const appConfig = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
const files = fs.readdirSync(appDir).filter((name) => name.endsWith(".tsx"));
const appEntries = fs.readdirSync(appDir, { withFileTypes: true });
const sourceRoots = [appDir, path.join(root, "lib"), path.join(root, "components")];
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : /\.(?:ts|tsx)$/.test(entry.name) ? [path.join(directory, entry.name)] : []);
const source = sourceRoots.flatMap(walk).map((name) => fs.readFileSync(name, "utf8")).join("\n");
const failures = [];
const welcomeImages = ["employer-welcome-hero.jpg", "employer-welcome-matches.jpg", "employer-welcome-review.jpg", "employer-welcome-operations.jpg"];
for (const image of welcomeImages) if (!fs.existsSync(path.join(root, "assets", "images", image))) failures.push(`Missing Employer welcome image: ${image}`);

const expectedRoutes = ["index.tsx", "sign-in.tsx", "register.tsx", "dashboard.tsx", "shifts.tsx", "post-shift.tsx", "applications.tsx", "team.tsx", "time.tsx", "account.tsx", "profile.tsx", "notifications.tsx", "operations.tsx", "clients.tsx", "client-schedule.tsx", "allocate-staff.tsx", "expenses.tsx", "invoices.tsx", "messages.tsx", "handoffs.tsx"];
for (const route of expectedRoutes) if (!files.includes(route)) failures.push(`Missing declared route: ${route}`);
const unexpectedRoutes = files.filter((route) => !expectedRoutes.includes(route) && route !== "_layout.tsx");
if (unexpectedRoutes.length) failures.push(`Unexpected route files: ${unexpectedRoutes.join(", ")}`);
const unexpectedRouteDirs = appEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
if (unexpectedRouteDirs.length) failures.push(`Unexpected route directories: ${unexpectedRouteDirs.join(", ")}`);
if (files.some((name) => /demo|reviewer|hidden|dev/i.test(name))) failures.push("A route filename suggests concealed or reviewer-specific behavior.");
if (/__DEV__|reviewer@|appreview|secret tap|remote.?flag/i.test(source)) failures.push("Source contains a prohibited review-specific or hidden activation pattern.");
if (/mock shift|sample caregiver|demo session/i.test(source)) failures.push("Source contains local sample-data behavior.");
if (/role\s*!==\s*["']admin["']|role\s*===\s*["']admin["']|role\s*==\s*["']admin["']/.test(source)) failures.push("Employer app must not grant access through an admin role.");
if (!source.includes("Create employer account")) failures.push("Public employer registration is not visible.");
if (!source.includes("Confirm password")) failures.push("Registration password confirmation is missing.");
if (!source.includes("Account created")) failures.push("Registration completion notice is missing.");
if (!source.includes("Elite Bridge Caregiver")) failures.push("Companion Caregiver app relationship is not disclosed.");
if (!source.includes("Delete account")) failures.push("In-app account deletion is missing.");
if (!source.includes("Sign out")) failures.push("Visible sign-out control is missing.");
if (!source.includes("Privacy Policy")) failures.push("Visible Privacy Policy access is missing.");
if (!source.includes("Organization profile")) failures.push("Editable organization profile is missing.");
if (!source.includes("Instant claim")) failures.push("Instant matched-shift assignment mode is missing.");
if (!source.includes("Review first")) failures.push("Employer-approval assignment mode is missing.");
if (!source.includes("Push notification settings")) failures.push("Push notification settings access is missing.");
if (!source.includes("Team directory")) failures.push("Employee team directory is missing.");
if (!source.includes("Time & attendance")) failures.push("Time and attendance workspace is missing.");
if (!source.includes("Account controls")) failures.push("Protected account controls access is missing.");
if (!source.includes("openEmployerShiftForPickup")) failures.push("Publishing a review-mode shift for caregiver pickup is missing.");
if (!source.includes("getClientInvoices") || !source.includes("createClientInvoice")) failures.push("Official client invoice access is missing.");
const clientSource = fs.readFileSync(path.join(appDir, "clients.tsx"), "utf8");
const scheduleSource = fs.readFileSync(path.join(appDir, "client-schedule.tsx"), "utf8");
const appLayoutSource = fs.readFileSync(path.join(appDir, "_layout.tsx"), "utf8");
if (!clientSource.includes("getEmployerClientLocations") || !clientSource.includes("createEmployerClientLocation")) failures.push("Clients is not connected to live employer records.");
if (!scheduleSource.includes("getEmployerClientLocations") || !scheduleSource.includes("caregiverRate") || !scheduleSource.includes("Publish care schedule?")) failures.push("Client schedule must use saved client and explicit confirmation.");
if (/Barry Schwartz|27 Pleasant Street|Post 8 visits for Barry/.test(scheduleSource)) failures.push("Client scheduling contains a fixed real-world client profile.");
if (!appLayoutSource.includes('data?.type === "care_checklist"') || !appLayoutSource.includes('data?.type === "timesheet_ready"')) failures.push("Employer push routing must include caregiver handovers and timesheets.");
const dashboardSource = fs.readFileSync(path.join(appDir, "dashboard.tsx"), "utf8");
if (!dashboardSource.includes('route: "/invoices"')) failures.push("The home invoice action is not connected to the invoice screen.");
const shiftSource = fs.readFileSync(path.join(appDir, "shifts.tsx"), "utf8");
if (!shiftSource.includes('label="All locations"')) failures.push("The schedule location filter is missing its All locations option.");
if (appConfig.expo.ios.bundleIdentifier !== "com.app.elitebridgeemployer") failures.push("Employer bundle identifier changed.");
if (appConfig.expo.version !== "1.3.9") failures.push("Employer release version must be 1.3.9.");
if (appConfig.expo.ios.buildNumber !== "43") failures.push("Employer iOS build number must be 43.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Release audit passed: ${expectedRoutes.length} explicit routes, confirmed-password registration, email-verification notice, visible account controls, live workforce tools, companion-app disclosure, and no reviewer-specific paths.`);
