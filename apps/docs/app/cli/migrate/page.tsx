import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/migrate") },
  title: "CLI migrate",
  description: "Migrate a legacy theme to the current Themvora format with the themvora CLI.",
};

export default function Page() {
  return <CliDocPage slug="migrate" />;
}