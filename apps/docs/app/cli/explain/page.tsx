import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/explain") },
  title: "CLI explain",
  description:
    "Explain how a theme was produced with the themvora CLI: source, recipe, brand anchors, contrast contract, and semantic mapping.",
};

export default function Page() {
  return <CliDocPage slug="explain" />;
}
