import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { collaborators } from "@/lib/db/schema";

export const recordFields = z.object({
  title: z.string().trim().min(1).max(200),
  iconId: z.string().max(100),
  data: z.string().max(500_000).nullable().optional(),
  bannerUrl: z.string().max(2048).nullable().optional(),
  inTrash: z.boolean().optional(),
});

export const metadataFields = recordFields.omit({ data: true }).partial();

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Please sign in to continue.");
  return user;
}

export async function requireWorkspaceAccess(workspaceId: string) {
  z.string().uuid().parse(workspaceId);
  const user = await requireUser();
  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, workspaceId),
  });
  if (!workspace) throw new Error("Workspace unavailable.");
  if (workspace.workspaceOwnerId !== user.id) {
    const membership = await db.query.collaborators.findFirst({
      where: and(
        eq(collaborators.workspaceId, workspaceId),
        eq(collaborators.userId, user.id)
      ),
    });
    if (!membership) throw new Error("Workspace unavailable.");
  }
  return workspace;
}

export async function requireFolderAccess(folderId: string) {
  z.string().uuid().parse(folderId);
  const folder = await db.query.folders.findFirst({
    where: (f, { eq }) => eq(f.id, folderId),
  });
  if (!folder?.workspaceId) throw new Error("Folder unavailable.");
  await requireWorkspaceAccess(folder.workspaceId);
  return folder;
}

export async function requireFileAccess(fileId: string) {
  z.string().uuid().parse(fileId);
  const file = await db.query.files.findFirst({
    where: (f, { eq }) => eq(f.id, fileId),
  });
  if (!file?.workspaceId) throw new Error("File unavailable.");
  await requireWorkspaceAccess(file.workspaceId);
  return file;
}
