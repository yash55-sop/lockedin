"use server";

import { unstable_cache as cache, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { Folder } from "@/types/db";

import { db } from "..";
import {
  metadataFields,
  recordFields,
  requireFolderAccess,
  requireWorkspaceAccess,
} from "../access";
import { folders } from "../schema";

export async function createFolder(folder: Folder) {
  const fields = recordFields
    .extend({
      id: z.string().uuid().optional(),
      workspaceId: z.string().uuid(),
    })
    .parse(folder);
  await requireWorkspaceAccess(fields.workspaceId);
  const [data] = await db.insert(folders).values(fields).returning();
  revalidateTag("get_folders");
  return data;
}
export const createFolderInDb = createFolder;

const readFolders = cache(
  async (workspaceId: string) =>
    db
      .select()
      .from(folders)
      .orderBy(folders.createdAt)
      .where(eq(folders.workspaceId, workspaceId)),
  ["get_folders"],
  { tags: ["get_folders"] }
);
export async function getFolders(workspaceId: string) {
  await requireWorkspaceAccess(workspaceId);
  return readFolders(workspaceId);
}
export const getFoldersFromDb = getFolders;

export async function updateFolder(
  folder: Pick<Folder, "id"> & Partial<Folder>
) {
  const existing = await requireFolderAccess(folder.id!);
  if (folder.workspaceId && folder.workspaceId !== existing.workspaceId)
    throw new Error("Cannot move a folder between workspaces.");
  const fields = metadataFields.parse(folder);
  const [data] = await db
    .update(folders)
    .set(fields)
    .where(eq(folders.id, existing.id))
    .returning();
  revalidateTag("get_folders");
  return data;
}
export const updateFolderInDb = updateFolder;

export async function deleteFolder(folderId: string) {
  await requireFolderAccess(folderId);
  const [data] = await db
    .delete(folders)
    .where(eq(folders.id, folderId))
    .returning();
  revalidateTag("get_folders");
  revalidateTag("get_files");
  return data;
}
export const deleteFolderFromDb = deleteFolder;
