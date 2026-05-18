import { Router, type IRouter } from "express";
import {
  GetArtistProfileResponse,
  UpdateArtistProfileBody,
  UpdateArtistProfileResponse,
} from "@workspace/api-zod";
import {
  getOrCreateArtistProfile,
  serializeArtistProfile,
  updateArtistProfile,
} from "../lib/artist-profile";

const router: IRouter = Router();

function nullableText(value?: string | null) {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

router.get("/artist-profile", async (req, res): Promise<void> => {
  const profile = await getOrCreateArtistProfile();
  res.json(GetArtistProfileResponse.parse(serializeArtistProfile(profile)));
});

router.patch("/artist-profile", async (req, res): Promise<void> => {
  const parsed = UpdateArtistProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.businessName !== undefined) updateData.businessName = parsed.data.businessName.trim();
  if (parsed.data.displayName !== undefined) updateData.displayName = parsed.data.displayName.trim();
  if (parsed.data.email !== undefined) updateData.email = nullableText(parsed.data.email);
  if (parsed.data.phone !== undefined) updateData.phone = nullableText(parsed.data.phone);
  if (parsed.data.website !== undefined) updateData.website = nullableText(parsed.data.website);
  if (parsed.data.instagram !== undefined) updateData.instagram = nullableText(parsed.data.instagram);
  if (parsed.data.paymentMethod !== undefined) updateData.paymentMethod = nullableText(parsed.data.paymentMethod);
  if (parsed.data.notes !== undefined) updateData.notes = nullableText(parsed.data.notes);

  const profile = await updateArtistProfile(updateData);
  res.json(UpdateArtistProfileResponse.parse(serializeArtistProfile(profile)));
});

export default router;
