import { prisma } from "@/lib/prisma";
import { STARTER_TEMPLATES } from "@/lib/letters/starters";

export async function ensureDefaultPortalTemplates(companyId: string | null) {
  const existing = await prisma.portalTemplate.count({
    where: companyId ? { companyId } : { companyId: null },
  });
  if (existing > 0) return;

  await prisma.portalTemplate.createMany({
    data: STARTER_TEMPLATES.map((starter) => ({
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
