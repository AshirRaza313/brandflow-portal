import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { buildReviewedPublicLeadMagnet } from "../src/lib/public-lead-magnet";

const OUTPUT_PATH = resolve(process.cwd(), "public/downloads/valtriox-introduction.pdf");

async function main() {
  const reviewedPdf = await buildReviewedPublicLeadMagnet();

  if (process.argv.includes("--check")) {
    const checkedInPdf = await readFile(OUTPUT_PATH);
    if (!checkedInPdf.equals(reviewedPdf)) {
      throw new Error("Checked-in public guide differs from the deterministic reviewed output");
    }
    process.stdout.write("Checked-in public guide matches deterministic reviewed output\n");
    return;
  }

  await writeFile(OUTPUT_PATH, reviewedPdf);
  process.stdout.write(`Generated reviewed beta guide at ${OUTPUT_PATH}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to generate public beta guide: ${message}\n`);
  process.exitCode = 1;
});
