import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/diff") },
  title: "CLI diff",
  description:
    "Compare two themes semantically with the themvora CLI: which roles changed, added, or were removed.",
};

export default function Page() {
  return <CliDocPage slug="diff" />;
}
