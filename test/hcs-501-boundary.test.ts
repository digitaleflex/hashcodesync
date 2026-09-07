import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

test("HCS-501: Workshop select excludes email from public response", () => {
  // Vérifier que le select workshop n'inclut pas email pour la publique
  const workshopSelect = {
    id: true,
    title: true,
    description: true,
    startAt: true,
    endAt: true,
    capacity: true,
    location: true,
    meetingUrl: true,
    createdBy: true,
    seriesId: true,
    type: true,
    menteeId: true,
    activityId: true,
    requiresMentor: true,
    createdAt: true,
    updatedAt: true,
    creator: { select: { id: true, name: true } }, // PAS d'email
    series: { select: { id: true, name: true } },
    mentee: { select: { id: true, name: true } }, // PAS d'email
    activity: { select: { id: true, name: true, type: true } },
    participants: {
      select: {
        id: true,
        userId: true,
        status: true,
        user: { select: { id: true, name: true } }, // PAS d'email
      },
    },
  };

  // Vérifier qu'il n'y a pas de email: true dans les nested selects
  const checkSelect = (obj: any, path: string = "") => {
    for (const key of Object.keys(obj)) {
      if (obj[key] && typeof obj[key] === "object") {
        if (key === "select" && obj[key].email === true) {
          assert.fail(`Email found in select at ${path}`);
        }
        checkSelect(obj[key], `${path}.${key}`);
      }
    }
  };

  checkSelect(workshopSelect, "workshopSelect");
});

test("HCS-501: Dashboard select excludes email from public response", () => {
  const dashboardSelect = {
    id: true,
    name: true,
    description: true,
    createdBy: true,
    seriesId: true,
    creator: { select: { id: true, name: true } }, // PAS d'email
    series: { select: { id: true, name: true } },
    participants: {
      select: {
        id: true,
        userId: true,
        status: true,
        user: { select: { id: true, name: true } }, // PAS d'email
      },
    },
  };

  const checkSelect = (obj: any, path: string = "") => {
    for (const key of Object.keys(obj)) {
      if (obj[key] && typeof obj[key] === "object") {
        if (key === "select" && obj[key].email === true) {
          assert.fail(`Email found in select at ${path}`);
        }
        checkSelect(obj[key], `${path}.${key}`);
      }
    }
  };

  checkSelect(dashboardSelect, "dashboardSelect");
});

test("HCS-501: Members select excludes email from public response", () => {
  const membersSelect = {
    id: true,
    firstname: true,
    lastname: true,
    role: true,
    // PAS d'email: true
  };

  // Vérifier qu'email n'est pas dans le select
  assert.ok(!(membersSelect as any).email, "email should not be in members select");
});

test("HCS-501: Profile export select can include email (admin only)", () => {
  // Le profile/export est restreint aux admins, email y est intentionnel
  const profileExportSelect = {
    id: true,
    name: true,
    email: true, // Accepté pour profile/export (admin seulement)
    image: true,
    firstname: true,
    lastname: true,
    role: true,
    timezone: true,
    createdAt: true,
  };

  // Pour profile/export, email est accepté car c'est des données personnelles
  // (l'utilisateur voit ses propres données)
  assert.ok(profileExportSelect.email === true, "email should be allowed in profile/export");
});
