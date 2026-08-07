import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(new URL("../assets/brand/caregiver-app-icon.svg", import.meta.url));
const expoIcon = fileURLToPath(new URL("../assets/images/icon.png", import.meta.url));
const nativeIcon = fileURLToPath(new URL("../ios/EliteBridgeAdmin/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png", import.meta.url));
const expoDir = fileURLToPath(new URL("../assets/images/", import.meta.url));
const nativeDir = fileURLToPath(new URL("../ios/EliteBridgeAdmin/Images.xcassets/AppIcon.appiconset/", import.meta.url));

await mkdir(expoDir, { recursive: true });
await mkdir(nativeDir, { recursive: true });

const png = await sharp(source)
  .resize(1024, 1024, { fit: "cover" })
  .flatten({ background: "#FFFDF8" })
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp(png).toFile(expoIcon);
await sharp(png).toFile(nativeIcon);
console.log("Prepared Elite Bridge caregiver app icons.");
