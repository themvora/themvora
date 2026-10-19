import type { Metadata } from "next";
import { CliDocPage } from "../../components/cli/cli-doc-page";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/cli") },
  title: "CLI Overview",
  description:
    "The @themvora/cli command-line toolkit — generate, list, validate, inspect, diff, explain, audit, and migrate themes from any shell, and scaffold or extend a project with init and add.",
};

export default function CliPage() {
  return <CliDocPage slug="overview" />;
}
