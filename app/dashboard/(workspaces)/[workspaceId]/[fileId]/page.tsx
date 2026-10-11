import { notFound } from "next/navigation";

import { TemplateEditor } from "@/components/templates/template-editor";
import {
  requireFileAccess,
  requireFolderAccess,
  requireUser,
  requireWorkspaceAccess,
} from "@/lib/db/access";
import { templateAiConfigured } from "@/lib/template-ai-client";
import { readDocument } from "@/lib/templates";

export default async function FilePage({
  params,
}: {
  params: Promise<{ workspaceId: string; fileId: string }>;
}) {
  const { workspaceId, fileId } = await params;
  const file = await requireFileAccess(fileId);
  if (file.workspaceId !== workspaceId || file.inTrash) notFound();
  const workspace = await requireWorkspaceAccess(workspaceId);
  if (workspace.inTrash) notFound();
  if (file.folderId) {
    const folder = await requireFolderAccess(file.folderId);
    if (folder.inTrash) notFound();
  }
  const user = await requireUser();
  const { document, legacy } = readDocument(file.data, file.title);
  return (
    <TemplateEditor
      key={fileId}
      initialDocument={document}
      initialData={file.data}
      legacy={legacy}
      legacyData={legacy ? file.data : null}
      aiAvailable={templateAiConfigured()}
      userId={user.id}
      target={{ kind: "file", id: fileId }}
    />
  );
}
