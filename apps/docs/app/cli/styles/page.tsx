import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/styles") },
  title: "CLI styles",
  description: "Using Themvora styles from the themvora CLI.",
};

export default function Page() {
  return <CliDocPage slug="styles" />;
}
