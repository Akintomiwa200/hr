/**
 * Move legacy inline base64 images out of Postgres and into Cloudinary.
 *
 * Rows covered:
 *   - Employee.avatar
 *   - Company.logo
 *   - User.preferences -> avatar (super admins / accounts without an employee)
 *
 * Inline base64 images are large: a few hundred profile photos can exceed a
 * database storage quota and make every query fail with SQLSTATE 53000. Once
 * this script has run, those columns only hold short Cloudinary URLs.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/migrate-images-to-cloudinary.ts --dry-run
 *   npx tsx --env-file=.env scripts/migrate-images-to-cloudinary.ts
 */
import { getPrismaClient, prisma } from "../lib/prisma";
import { getCloudinaryConfig, uploadToCloudinary } from "../lib/cloudinary";

const DRY_RUN = process.argv.includes("--dry-run");

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};

function parseDataUri(value: string) {
  if (!value.startsWith("data:")) return null;
  const comma = value.indexOf(",");
  if (comma === -1) return null;
  const header = value.slice(5, comma);
  const payload = value.slice(comma + 1);
  const parts = header.split(";");
  const mimeType = (parts[0] || "image/png").toLowerCase();
  const isBase64 = parts.some((part) => part.toLowerCase() === "base64");
  try {
    const buffer = isBase64
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
    if (!buffer.length) return null;
    return { mimeType, buffer };
  } catch {
    return null;
  }
}

function extensionFor(mimeType: string) {
  return EXTENSION_BY_MIME[mimeType] ?? "png";
}

type Job = {
  label: string;
  dataUri: string;
  publicId: string;
  apply: (url: string) => Promise<void>;
};

async function main() {
  if (!getCloudinaryConfig()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
    );
  }

  const [employees, companies, users] = await Promise.all([
    prisma.employee.findMany({
      where: { avatar: { startsWith: "data:" } },
      select: { id: true, avatar: true },
    }),
    prisma.company.findMany({
      where: { logo: { startsWith: "data:" } },
      select: { id: true, logo: true },
    }),
    prisma.user.findMany({
      where: { preferences: { contains: "data:image" } },
      select: { id: true, preferences: true },
    }),
  ]);

  const jobs: Job[] = [];

  for (const employee of employees) {
    if (!employee.avatar) continue;
    jobs.push({
      label: `Employee.avatar ${employee.id}`,
      dataUri: employee.avatar,
      publicId: `smarthr/avatars/${employee.id}`,
      apply: async (url) => {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { avatar: url },
        });
      },
    });
  }

  for (const company of companies) {
    if (!company.logo) continue;
    jobs.push({
      label: `Company.logo ${company.id}`,
      dataUri: company.logo,
      publicId: `smarthr/company/${company.id}/logo`,
      apply: async (url) => {
        await prisma.company.update({
          where: { id: company.id },
          data: { logo: url },
        });
      },
    });
  }

  for (const user of users) {
    if (!user.preferences) continue;
    let prefs: Record<string, unknown>;
    try {
      prefs = JSON.parse(user.preferences) as Record<string, unknown>;
    } catch {
      continue;
    }
    const avatar = prefs.avatar;
    if (typeof avatar !== "string" || !avatar.startsWith("data:")) continue;
    jobs.push({
      label: `User.preferences.avatar ${user.id}`,
      dataUri: avatar,
      publicId: `smarthr/avatars/${user.id}`,
      apply: async (url) => {
        prefs.avatar = url;
        await prisma.user.update({
          where: { id: user.id },
          data: { preferences: JSON.stringify(prefs) },
        });
      },
    });
  }

  console.log(
    `${jobs.length} inline image(s) found${DRY_RUN ? " (dry run)" : ""}.`
  );

  let migrated = 0;
  let failed = 0;
  let freedBytes = 0;

  for (const job of jobs) {
    const parsed = parseDataUri(job.dataUri);
    if (!parsed) {
      console.warn(`skip ${job.label}: unrecognised data URI`);
      continue;
    }
    console.log(
      `${DRY_RUN ? "[dry-run] " : ""}${job.label} (${(
        parsed.buffer.length / 1024
      ).toFixed(0)} KB)`
    );

    if (DRY_RUN) {
      migrated += 1;
      freedBytes += job.dataUri.length;
      continue;
    }

    try {
      const uploaded = await uploadToCloudinary({
        buffer: parsed.buffer,
        filename: `image.${extensionFor(parsed.mimeType)}`,
        mimeType: parsed.mimeType,
        publicId: job.publicId,
        resourceType: "image",
      });
      await job.apply(uploaded.url);
      migrated += 1;
      freedBytes += job.dataUri.length - uploaded.url.length;
      console.log(`  -> ${uploaded.url}`);
    } catch (error) {
      failed += 1;
      console.error(
        `  failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log(
    `\nmigrated=${migrated} failed=${failed} approxFreed=${(
      freedBytes /
      1024 /
      1024
    ).toFixed(2)} MB`
  );
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
