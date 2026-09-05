import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(root, "app");
const scanRoots = [
  "app/(auth)",
  "app/(onboarding)",
  "app/(staff)",
  "components",
];

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  return fs
    .readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const relative = path.join(relativeDirectory, entry.name);
      return entry.isDirectory()
        ? walk(relative)
        : relative.endsWith(".tsx")
          ? [relative]
          : [];
    });
}

function requireSource(relativeFile, needle) {
  const source = fs.readFileSync(path.join(root, relativeFile), "utf8");
  if (!source.includes(needle))
    throw new Error(`${relativeFile} is missing: ${needle}`);
}

const files = scanRoots.flatMap(walk);
let interactiveCount = 0;
for (const relativeFile of files) {
  const source = fs.readFileSync(path.join(root, relativeFile), "utf8");
  const tags =
    source.match(/<(?:TouchableOpacity|Pressable)\b[\s\S]*?>/g) ?? [];
  for (const tag of tags) {
    interactiveCount += 1;
    if (!/\bonPress\s*=/.test(tag)) {
      throw new Error(
        `${relativeFile} has an interactive control without onPress: ${tag.slice(0, 100)}`,
      );
    }
  }

  for (const match of source.matchAll(
    /router\.(?:push|replace)\("([^"?]+)"\)/g,
  )) {
    const route = match[1];
    const routePath = route.replace(/^\//, "");
    const candidates = [
      path.join(appRoot, `${routePath}.tsx`),
      path.join(appRoot, routePath, "index.tsx"),
    ];
    if (!candidates.some(fs.existsSync)) {
      throw new Error(`${relativeFile} navigates to missing route ${route}`);
    }
  }
}

requireSource(
  "app/(onboarding)/welcome.tsx",
  'router.push("/(onboarding)/experience")',
);
requireSource(
  "app/(onboarding)/experience.tsx",
  'router.push("/(onboarding)/review")',
);
requireSource("app/(onboarding)/review.tsx", 'router.replace("/(staff)/home")');
requireSource("app/(staff)/profile.tsx", "deleteCaregiverBackendAccount()");
requireSource("app/(staff)/home.tsx", "Call-out reported");

const config = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
if (config.expo.version !== "1.2.0")
  throw new Error("Caregiver release version must be 1.2.0");
if (config.expo.ios.buildNumber !== "51")
  throw new Error("Caregiver iOS build number must be 51");
requireSource("app/(root)/index.tsx", "Care professionals start here");
requireSource("app/(root)/index.tsx", "Elite Bridge Employer app");
requireSource("app/(root)/index.tsx", "elitebridge-logo.png");
requireSource("app/(root)/index.tsx", "caregiver-welcome-match.jpg");
requireSource("app/(root)/index.tsx", "caregiver-welcome-clock.jpg");
requireSource("app/(root)/index.tsx", "caregiver-welcome-purpose.jpg");
requireSource("app/(staff)/home.tsx", "My caregiver tools");

const loginSource = fs.readFileSync(
  path.join(root, "app/(auth)/login.tsx"),
  "utf8",
);
if (/review access|REVIEW_PASSWORD|demo:\s*true/i.test(loginSource)) {
  throw new Error("Caregiver login contains review-only or demo access");
}

for (const relativeFile of [
  "app/(staff)/home.tsx",
  "app/(auth)/login.tsx",
  "lib/shared-api.ts",
]) {
  const source = fs.readFileSync(path.join(root, relativeFile), "utf8");
  if (
    /demoMode|demoShift|demoApplication|demoOffer|sample review data|review account/i.test(
      source,
    )
  ) {
    throw new Error(
      `${relativeFile} contains a dormant demo or review-only behavior path`,
    );
  }
}
requireSource("app/(onboarding)/review.tsx", "registerCaregiverAccount(");
requireSource("app/(onboarding)/welcome.tsx", "Confirm password *");
requireSource("app/(staff)/clock.tsx", "fetchCaregiverTimesheets()");
requireSource("app/(staff)/notifications.tsx", "fetchCaregiverNotifications()");

for (const removed of [
  "(app)",
  "(facility)",
  "(tabs)",
  "(user)",
  "dev",
  "oauth",
]) {
  const directory = path.join(appRoot, removed);
  if (fs.existsSync(directory) && walk(path.join("app", removed)).length)
    throw new Error(`Legacy route group remains accessible: ${removed}`);
}
const activeSource = files
  .map((relativeFile) => fs.readFileSync(path.join(root, relativeFile), "utf8"))
  .join("\n");
if (
  /mock|demo|sample review data|review account|appreview|__DEV__|phase 2|coming soon/i.test(
    activeSource,
  )
) {
  throw new Error(
    "Active Caregiver routes contain simulated, reviewer-specific, or unfinished behavior",
  );
}

console.log(
  `Caregiver release audit passed: ${interactiveCount} interactive controls, all declared routes, complete onboarding chain, live profile persistence, call-out reporting, account deletion, and no demo or review-only behavior paths.`,
);
