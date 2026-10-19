import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/brands") },
  title: "CLI brands",
  description: "Using Themvora brands from the themvora CLI.",
};

export default function Page() {
  return <CliDocPage slug="brands" />;
}
