import { unlink } from "fs/promises";
import { join } from "path";

// Supprime un fichier ré-uploadé (chemin relatif type "/uploads/x.png").
export async function removeUpload(relativeUrl: string) {
  if (!relativeUrl.startsWith("/uploads/")) return;
  try {
    await unlink(join(process.cwd(), "public", relativeUrl));
  } catch {
    // Fichier déjà absent : sans gravité.
  }
}