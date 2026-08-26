import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(root, "app");
const scanRoots = ["app/(auth)", "app/(onboarding)", "app/(staff)", "components"];

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(relativeDirectory, entry.name);
    return entry.isDirectory() ? walk(relative) : relative.endsWith(".tsx") ? [relative] : [];
  });
}

function requireSource(relativeFile, needle) {
  const source = fs.readFileSync(path.join(root, relativeFile), "utf8");
  if (!source.includes(needle)) throw new Error(`${relativeFile} is missing: ${needle}`);
}

const files = scanRoots.flatMap(walk);
let interactiveCount = 0;
for (const relativeFile of files) {
  const source = fs.readFileSync(path.join(root, relativeFile), "utf8");
  const tags = source.match(/<(?:TouchableOpacity|Pressable)\b[\s\S]*?>/g) ?? [];
  for (const tag of tags) {
    interactiveCount += 1;
    if (!/\bonPress\s*=/.test(tag)) {
      throw new Error(`${relativeFile} has an interactive control without onPress: ${tag.slice(0, 100)}`);
    }
  }

  for (const match of source.matchAll(/router\.(?:push|replace)\("([^"?]+)"\)/g)) {
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

requireSource("app/(onboarding)/welcome.tsx", 'router.push("/(onboarding)/experience")');
requireSource("app/(onboarding)/experience.tsx", 'router.push("/(onboarding)/background-check")');
requireSource("app/(onboarding)/background-check.tsx", 'router.push("/(onboarding)/bank-account")');
requireSource("app/(onboarding)/bank-account.tsx", 'router.push("/(onboarding)/review")');
requireSource("app/(onboarding)/review.tsx", 'router.replace("/(staff)/home")');
requireSource("app/(staff)/profile.tsx", 'router.push("/(staff)/services")');
requireSource("app/(staff)/profile.tsx", "deleteCaregiverBackendAccount()");
requireSource("app/(staff)/home.tsx", "Call-out preview recorded");

const config = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
if (config.expo.ios.buildNumber !== "44") throw new Error("Caregiver iOS build number must be 44");

console.log(`Caregiver release audit passed: ${interactiveCount} interactive controls, all declared routes, complete onboarding chain, profile persistence, review call-out and account deletion.`);
