import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";

// Upload d'image (couverts de groupes, avatars...). Fichiers stockés dans
// public/uploads/ et servis statiquement par Next. Limites : types + taille.
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Signatures binaires (magic bytes) — le MIME fourni par le client est spoofable.
// Vérification des premiers octets pour garantir qu'il s'agit bien d'une image.
const MAGIC: Array<{ mime: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  { mime: "image/webp", test: (b) => b.length >= 12 && b.slice(0, 4).toString("latin1") === "RIFF" && b.slice(8, 12).toString("latin1") === "WEBP" },
  { mime: "image/gif", test: (b) => b.length >= 6 && b.toString("latin1", 0, 6) === "GIF89a" || (b.length >= 6 && b.toString("latin1", 0, 6) === "GIF87a") },
];

function sniffImage(buffer: Buffer): string | null {
  for (const m of MAGIC) {
    if (m.test(buffer)) return m.mime;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé (jpg, png, webp, gif)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image trop lourde (5 Mo maximum)" },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Vérification du contenu réel (magic bytes), pas seulement du MIME déclaré.
  const detected = sniffImage(buffer);
  if (!detected || detected !== file.type) {
    return NextResponse.json(
      { error: "Contenu du fichier non reconnu comme une image valide" },
      { status: 400 }
    );
  }

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${EXT[detected]}`;
  await writeFile(join(dir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
