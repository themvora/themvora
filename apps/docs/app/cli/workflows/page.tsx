import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/workflows") },
  title: "CLI Workflows",
  description: "Theme authoring workflows with the themvora CLI: the generate → validate → inspect → diff → explain loop, light/dark pairs, project setup with init and add, and export for another system.",
};

export default function Page() {
  return <CliDocPage slug="workflows" />;
}