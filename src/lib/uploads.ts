import { unlink } from "fs/promises";
import { resolve, basename } from "path";

const UPLOADS_DIR = resolve(process.cwd(), "public", "uploads");

// Supprime un fichier ré-uploadé (chemin relatif type "/uploads/x.png").
// Sécurisé : on ne supprime QUE le basename, résolu dans public/uploads.
// Empêche toute traversée de chemin (ex. "/uploads/../../.env").
export async function removeUpload(relativeUrl: string | null | undefined) {
  if (typeof relativeUrl !== "string" || !relativeUrl.startsWith("/uploads/")) {
    return;
  }
  const name = basename(relativeUrl);
  if (!name || name === "." || name === "..") return;
  try {
    const target = resolve(UPLOADS_DIR, name);
    // Double garde : le chemin résolu doit rester dans le dossier uploads.
    if (!target.startsWith(UPLOADS_DIR + "\\") && !target.startsWith(UPLOADS_DIR + "/")) {
      return;
    }
    await unlink(target);
  } catch {
    // Fichier déjà absent : sans gravité.
  }
}