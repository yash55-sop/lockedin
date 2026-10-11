import { notFound } from "next/navigation";

import { TemplateEditor } from "@/components/templates/template-editor";
import { requireUser, requireWorkspaceAccess } from "@/lib/db/access";
import { templateAiConfigured } from "@/lib/template-ai-client";
import { readDocument } from "@/lib/templates";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const workspace = await requireWorkspaceAccess(workspaceId);
  if (workspace.inTrash) notFound();
  const user = await requireUser();
  const { document, legacy } = readDocument(workspace.data, workspace.title);
  return (
    <TemplateEditor
      key={workspaceId}
      initialDocument={document}
      initialData={workspace.data}
      legacy={legacy}
      legacyData={legacy ? workspace.data : null}
      aiAvailable={templateAiConfigured()}
      userId={user.id}
      target={{ kind: "workspace", id: workspaceId }}
    />
  );
}
