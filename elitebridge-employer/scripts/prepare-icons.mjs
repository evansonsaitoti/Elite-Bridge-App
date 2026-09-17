import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(new URL("../assets/brand/employer-app-icon.svg", import.meta.url));
const expoIcon = fileURLToPath(new URL("../assets/images/icon.png", import.meta.url));
const expoDir = fileURLToPath(new URL("../assets/images/", import.meta.url));

await mkdir(expoDir, { recursive: true });

await sharp(source)
  .resize(1024, 1024, { fit: "cover" })
  .flatten({ background: "#FFFDF8" })
  .png({ compressionLevel: 9 })
  .toFile(expoIcon);

console.log("Prepared Elite Bridge Employer app icon.");
