import type { Metadata } from "next";
import { CliDocPage } from "../../../components/cli/cli-doc-page";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli/doctor") },
  title: "CLI doctor",
  description: "The themvora CLI doctor command.",
};

export default function Page() {
  return <CliDocPage slug="doctor" />;
}
