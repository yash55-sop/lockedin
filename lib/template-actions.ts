"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  requireFileAccess,
  requireFolderAccess,
  requireWorkspaceAccess,
} from "@/lib/db/access";
import { files, workspaces } from "@/lib/db/schema";
import { templateDocumentSchema } from "@/lib/templates";

const saveSchema = z.object({
  kind: z.enum(["workspace", "file"]),
  id: z.string().uuid(),
  document: templateDocumentSchema,
  expectedData: z.string().max(500000).nullable(),
  expectedTitle: z.string().trim().min(1).max(200),
});

export async function saveTemplateDocument(input: unknown) {
  const { kind, id, document, expectedData, expectedTitle } =
    saveSchema.parse(input);
  const data = JSON.stringify(document);
  if (data.length > 250000)
    throw new Error(
      "This template is too large to save. Remove some content and try again."
    );
  let path: string;
  let updatedFile: typeof files.$inferSelect | null = null;
  if (kind === "workspace") {
    const workspace = await requireWorkspaceAccess(id);
    if (workspace.inTrash)
      throw new Error("Restore this workspace before editing it.");
    const [saved] = await db
      .update(workspaces)
      .set({ data, title: document.title })
      .where(
        and(
          eq(workspaces.id, id),
          eq(workspaces.inTrash, false),
          eq(workspaces.title, expectedTitle),
          expectedData === null ?
            isNull(workspaces.data)
          : eq(workspaces.data, expectedData)
        )
      )
      .returning();
    if (!saved)
      throw new Error(
        "This page changed elsewhere. Export your draft, reload the page, and restore or import your changes."
      );
    revalidateTag("get_private_workspaces");
    revalidateTag("get_shared_workspaces");
    revalidateTag("get_collaborating_workspaces");
    path = `/dashboard/${id}`;
  } else {
    const file = await requireFileAccess(id);
    if (file.inTrash) throw new Error("Restore this page before editing it.");
    const workspace = await requireWorkspaceAccess(file.workspaceId!);
    if (workspace.inTrash)
      throw new Error("Restore this workspace before editing it.");
    if (file.folderId) {
      const folder = await requireFolderAccess(file.folderId);
      if (folder.inTrash)
        throw new Error("Restore this folder before editing its pages.");
    }
    const [saved] = await db
      .update(files)
      .set({ data, title: document.title })
      .where(
        and(
          eq(files.id, id),
          eq(files.inTrash, false),
          eq(files.title, expectedTitle),
          expectedData === null ?
            isNull(files.data)
          : eq(files.data, expectedData)
        )
      )
      .returning();
    if (!saved)
      throw new Error(
        "This page changed elsewhere. Export your draft, reload the page, and restore or import your changes."
      );
    updatedFile = saved;
    revalidateTag("get_files");
    path = `/dashboard/${file.workspaceId}/${id}`;
  }
  revalidatePath(path);
  return { saved: true as const, file: updatedFile };
}
