import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = new URL("../assets/brand/employer-app-icon.svg", import.meta.url);
const expoIcon = new URL("../assets/images/icon.png", import.meta.url);

await mkdir(new URL("../assets/images/", import.meta.url), { recursive: true });

await sharp(source)
  .resize(1024, 1024, { fit: "cover" })
  .flatten({ background: "#FFFDF8" })
  .png({ compressionLevel: 9 })
  .toFile(expoIcon);

console.log("Prepared Elite Bridge Employer app icon.");
