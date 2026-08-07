import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(new URL("../assets/brand/caregiver-app-icon.svg", import.meta.url));
const expoIcon = fileURLToPath(new URL("../assets/images/icon.png", import.meta.url));
const nativeIcon = fileURLToPath(new URL("../ios/EliteBridgeAdmin/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png", import.meta.url));
const expoDir = fileURLToPath(new URL("../assets/images/", import.meta.url));
const nativeDir = fileURLToPath(new URL("../ios/EliteBridgeAdmin/Images.xcassets/AppIcon.appiconset/", import.meta.url));
const xcodeProject = fileURLToPath(new URL("../ios/EliteBridgeAdmin.xcodeproj/project.pbxproj", import.meta.url));
const buildNumber = "19";

await mkdir(expoDir, { recursive: true });
await mkdir(nativeDir, { recursive: true });

const png = await sharp(source)
  .resize(1024, 1024, { fit: "cover" })
  .flatten({ background: "#FFFDF8" })
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp(png).toFile(expoIcon);
await sharp(png).toFile(nativeIcon);

const projectText = await readFile(xcodeProject, "utf8");
const versionMatches = projectText.match(/CURRENT_PROJECT_VERSION = \d+;/g) || [];
if (versionMatches.length < 2) {
  throw new Error("Could not locate both native iOS CURRENT_PROJECT_VERSION settings.");
}
await writeFile(
  xcodeProject,
  projectText.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`),
  "utf8",
);

console.log(`Prepared Elite Bridge caregiver icons and native iOS build ${buildNumber}.`);
