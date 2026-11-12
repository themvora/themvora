import type { Metadata } from "next";

import FrameworkExamplesPage, {
  generateMetadata as generateExamplesMetadata,
} from "../../../[slug]/examples/page";

export function generateMetadata(): Promise<Metadata> {
  return generateExamplesMetadata({
    params: Promise.resolve({ slug: "react-router" }),
  });
}

export default async function Page() {
  return FrameworkExamplesPage({
    params: Promise.resolve({ slug: "react-router" }),
  });
}
