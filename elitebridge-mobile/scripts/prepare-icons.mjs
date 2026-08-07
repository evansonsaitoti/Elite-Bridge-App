import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = new URL("../assets/brand/caregiver-app-icon.svg", import.meta.url);
const expoIcon = new URL("../assets/images/icon.png", import.meta.url);
const nativeIcon = new URL("../ios/EliteBridgeAdmin/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png", import.meta.url);

await mkdir(new URL("../assets/images/", import.meta.url), { recursive: true });
await mkdir(new URL("../ios/EliteBridgeAdmin/Images.xcassets/AppIcon.appiconset/", import.meta.url), { recursive: true });

const png = await sharp(source)
  .resize(1024, 1024, { fit: "cover" })
  .flatten({ background: "#FFFDF8" })
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp(png).toFile(expoIcon);
await sharp(png).toFile(nativeIcon);
console.log("Prepared Elite Bridge caregiver app icons.");
