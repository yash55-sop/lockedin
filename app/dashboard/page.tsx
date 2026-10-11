import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = {
  title: "Dashboard",
  description: "Your workspaces",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await db.query.workspaces.findFirst({
    where: (workspace, { eq, and }) =>
      and(
        eq(workspace.workspaceOwnerId, user.id),
        eq(workspace.inTrash, false)
      ),
  });

  if (!workspace) {
    redirect(`/dashboard/new-workspace`);
  }

  redirect(`/dashboard/${workspace.id}`);
}
