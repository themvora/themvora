import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/add") },
  title: "CLI add",
  description: "The themvora CLI add command.",
};

export default function Page() {
  return <CliDocPage slug="add" />;
}
