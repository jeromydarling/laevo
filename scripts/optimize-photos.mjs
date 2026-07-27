/**
 * Turns the full-size source photographs into what the site actually serves.
 *
 * The marketing copy promises Laevo works on an old phone and on the sort of
 * wifi a community hall has. A page full of 5MB PNGs would make that a lie, so
 * every photograph ships as WebP at two widths with a JPEG fallback, and the
 * dimensions are written into a manifest the components read so no image can
 * be placed without a width and height to reserve space with.
 *
 * sharp is deliberately NOT a dependency of this project: the optimized
 * images are committed, so a normal build and deploy never needs it. Install
 * it only when regenerating.
 *
 * Run: npm i -D sharp && npm run photos -- <source-dir>
 */
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("Usage: node scripts/optimize-photos.mjs <source-dir>");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "public", "photos");
await mkdir(outDir, { recursive: true });

/** Two widths is enough: a phone and everything else. */
const WIDTHS = { wide: [800, 1600], standard: [600, 1200] };

const files = (await readdir(sourceDir)).filter((f) => f.endsWith(".png"));
const manifest = {};

for (const file of files) {
  const name = path.basename(file, ".png");
  const input = path.join(sourceDir, file);
  const meta = await sharp(input).metadata();
  const shape = meta.width / meta.height > 1.5 ? "wide" : "standard";
  const widths = WIDTHS[shape];

  for (const width of widths) {
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 6 })
      .toFile(path.join(outDir, `${name}-${width}.webp`));
  }

  // One JPEG, at the larger width, for anything too old for WebP.
  await sharp(input)
    .resize({ width: widths[1], withoutEnlargement: true })
    .jpeg({ quality: 76, mozjpeg: true, progressive: true })
    .toFile(path.join(outDir, `${name}-${widths[1]}.jpg`));

  manifest[name] = {
    widths,
    aspect: shape === "wide" ? "16 / 9" : "4 / 3",
    width: widths[1],
    height: Math.round(widths[1] / (meta.width / meta.height)),
  };
  console.log(`${name}: ${shape}, ${widths.join("/")}`);
}

// Dimensions are printed rather than written next to the images: they belong
// in app/content/photos.ts alongside the alt text, which has to be written by
// a person and is the only part of a photograph a screen reader ever gets.
console.log(`\n${files.length} photographs written to public/photos`);
console.log("Dimensions for app/content/photos.ts:");
console.log(JSON.stringify(manifest, null, 2));
