import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppStateProvider } from "@/components/app-state-provider";
import { getCurrentUser } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/lib/db/access";
import { getFiles, getFolders } from "@/lib/db/queries";
import { parsePanelCookies } from "@/lib/panel-cookies";
import { ResizableLayout } from "../components/resizable-layout";

export const WorkspaceLayout: React.FCC<{
  params: Promise<{ workspaceId: string }>;
}> = async ({ params, children }) => {
  const { workspaceId } = await params;

  const user = await getCurrentUser();

  if (!user) redirect("/login");
  await requireWorkspaceAccess(workspaceId);

  const cookieStore = await cookies();

  const layout = cookieStore.get("react-resizable-panels:layout");
  const collapsed = cookieStore.get("react-resizable-panels:collapsed");

  const { defaultLayout, defaultCollapsed } = parsePanelCookies(
    layout?.value,
    collapsed?.value
  );

  const [files, folders] = await Promise.all([
    getFiles(workspaceId),
    getFolders(workspaceId),
  ]);

  return (
    <AppStateProvider
      key={workspaceId}
      user={user}
      files={files}
      folders={folders}
    >
      <ResizableLayout
        defaultLayout={defaultLayout as number[]}
        defaultCollapsed={defaultCollapsed as boolean}
      >
        {children}
      </ResizableLayout>
    </AppStateProvider>
  );
};

export default WorkspaceLayout;
