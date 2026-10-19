import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/init") },
  title: "CLI init",
  description: "The themvora CLI init command.",
};

export default function Page() {
  return <CliDocPage slug="init" />;
}
