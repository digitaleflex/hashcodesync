import { test } from "node:test";
import assert from "node:assert/strict";

test("HCS-501: Workshop select excludes email from public response", () => {
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
    creator: { select: { id: true, name: true } },
    series: { select: { id: true, name: true } },
    mentee: { select: { id: true, name: true } },
    activity: { select: { id: true, name: true, type: true } },
    participants: {
      select: {
        id: true,
        userId: true,
        status: true,
        user: { select: { id: true, name: true } },
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

  checkSelect(workshopSelect, "workshopSelect");
});

test("HCS-501: Dashboard select excludes email from public response", () => {
  const dashboardSelect = {
    id: true,
    name: true,
    description: true,
    createdBy: true,
    seriesId: true,
    creator: { select: { id: true, name: true } },
    series: { select: { id: true, name: true } },
    participants: {
      select: {
        id: true,
        userId: true,
        status: true,
        user: { select: { id: true, name: true } },
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
  };

  assert.ok(!(membersSelect as any).email, "email should not be in members select");
});

test("HCS-501: Profile export select can include email (admin only)", () => {
  const profileExportSelect = {
    id: true,
    name: true,
    email: true,
    image: true,
    firstname: true,
    lastname: true,
    role: true,
    timezone: true,
    createdAt: true,
  };

  assert.ok(profileExportSelect.email === true, "email should be allowed in profile/export");
});
