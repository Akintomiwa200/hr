import { prisma } from "@/lib/prisma";
import { STARTER_TEMPLATES } from "@/lib/letters/starters";

export async function ensureDefaultPortalTemplates(companyId: string | null) {
  const scope = companyId ? { companyId } : { companyId: null };
  const existing = await prisma.portalTemplate.findMany({
    where: { ...scope, createdByName: "Smart HR" },
    select: { id: true, title: true, description: true },
  });
  const employmentOffer = STARTER_TEMPLATES.find(
    (starter) => starter.kind === "LETTER" && starter.category === "OFFER"
  );
  const legacyOffer = employmentOffer
    ? existing.find(
        (template) =>
          template.title === employmentOffer.title &&
          template.description === "Detailed employment offer with role, work terms, salary, and acceptance."
      )
    : undefined;
  if (legacyOffer && employmentOffer) {
    await prisma.portalTemplate.update({
      where: { id: legacyOffer.id },
      data: {
        description: employmentOffer.description,
        body: employmentOffer.body,
        fieldsJson: JSON.stringify(employmentOffer.fields),
      },
    });
  }
  const existingTitles = new Set(existing.map((template) => template.title));
  const missing = STARTER_TEMPLATES.filter((starter) => !existingTitles.has(starter.title));
  if (missing.length === 0) return;

  await prisma.portalTemplate.createMany({
    data: missing.map((starter) => ({
      companyId,
      kind: starter.kind,
      category: starter.category,
      title: starter.title,
      description: starter.description,
      body: starter.body,
      fieldsJson: JSON.stringify(starter.fields),
      isPublished: true,
      createdByName: "Smart HR",
    })),
  });
}
