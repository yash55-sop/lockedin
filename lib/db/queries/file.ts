"use server";

import { unstable_cache as cache, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { File } from "@/types/db";

import { db } from "..";
import {
  metadataFields,
  recordFields,
  requireFileAccess,
  requireFolderAccess,
  requireWorkspaceAccess,
} from "../access";
import { files } from "../schema";

export async function createFile(file: File) {
  const fields = recordFields
    .extend({
      id: z.string().uuid().optional(),
      workspaceId: z.string().uuid(),
      folderId: z.string().uuid(),
    })
    .parse(file);
  await requireWorkspaceAccess(fields.workspaceId);
  const folder = await requireFolderAccess(fields.folderId);
  if (folder.workspaceId !== fields.workspaceId || folder.inTrash)
    throw new Error("Choose an active folder in this workspace.");
  const [data] = await db.insert(files).values(fields).returning();
  revalidateTag("get_files");
  return data;
}
const readFiles = cache(
  async (workspaceId: string) =>
    db
      .select()
      .from(files)
      .orderBy(files.createdAt)
      .where(eq(files.workspaceId, workspaceId)),
  ["get_files"],
  { tags: ["get_files"] }
);
export async function getFiles(workspaceId: string) {
  await requireWorkspaceAccess(workspaceId);
  return readFiles(workspaceId);
}
export const getFilesFromDb = getFiles;
export async function updateFile(file: Pick<File, "id"> & Partial<File>) {
  const existing = await requireFileAccess(file.id!);
  if (
    (file.workspaceId && file.workspaceId !== existing.workspaceId) ||
    (file.folderId && file.folderId !== existing.folderId)
  )
    throw new Error("Cannot move a file between folders.");
  // Content is saved through the template action. Sidebar metadata snapshots
  // can be stale and must never overwrite a newer template document.
  const fields = metadataFields.parse(file);
  const [data] = await db
    .update(files)
    .set(fields)
    .where(eq(files.id, existing.id))
    .returning();
  revalidateTag("get_files");
  return data;
}
export const updateFileInDb = updateFile;
export async function deleteFile(fileId: string) {
  await requireFileAccess(fileId);
  const [data] = await db.delete(files).where(eq(files.id, fileId)).returning();
  revalidateTag("get_files");
  return data;
}
export const deleteFileFromDb = deleteFile;
