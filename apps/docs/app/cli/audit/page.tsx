import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/audit") },
  title: "CLI audit",
  description: "The themvora CLI audit command.",
};

export default function Page() {
  return <CliDocPage slug="audit" />;
}
