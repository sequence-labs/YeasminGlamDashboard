import { eq } from "drizzle-orm";
import { artistProfilesTable, db } from "@workspace/db";

const defaultArtistProfile = {
  businessName: "Glam CRM",
  displayName: "Yeasmin Bhuiyan",
  email: "yeasminbhuiyan1997@gmail.com",
  phone: "(555) 020-0000",
  website: null,
  instagram: null,
  paymentMethod: "As agreed",
  notes: null,
};

export function serializeArtistProfile(profile: typeof artistProfilesTable.$inferSelect) {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function getOrCreateArtistProfile() {
  const [existing] = await db.select().from(artistProfilesTable).orderBy(artistProfilesTable.id).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(artistProfilesTable).values(defaultArtistProfile).returning();
  return created;
}

export async function updateArtistProfile(values: Partial<typeof artistProfilesTable.$inferInsert>) {
  const existing = await getOrCreateArtistProfile();
  const [updated] = await db.update(artistProfilesTable)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(artistProfilesTable.id, existing.id))
    .returning();

  return updated;
}
