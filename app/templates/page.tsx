import { headers } from "next/headers";

import { TemplateStudio } from "@/components/templates/template-studio";
import {
  localStudioAiAllowed,
  templateAiConfigured,
} from "@/lib/template-ai-client";

export const metadata = {
  title: "Workspace",
  description:
    "Build your own productivity templates with editable charts, habits, tasks, and notes.",
};

export default async function TemplatesPage() {
  const requestHeaders = await headers();
  const aiAvailable =
    templateAiConfigured() &&
    localStudioAiAllowed(
      requestHeaders.get("host"),
      requestHeaders.get("origin")
    );
  return <TemplateStudio aiAvailable={aiAvailable} />;
}
