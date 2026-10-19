import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/list") },
  title: "CLI list",
  description:
    "List the canonical Themvora brands, presets, styles, and init-supported frameworks with the themvora CLI.",
};

export default function Page() {
  return <CliDocPage slug="list" />;
}
