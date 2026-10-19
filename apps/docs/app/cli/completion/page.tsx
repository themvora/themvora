import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/completion") },
  title: "CLI completion",
  description: "The themvora CLI completion command.",
};

export default function Page() {
  return <CliDocPage slug="completion" />;
}
