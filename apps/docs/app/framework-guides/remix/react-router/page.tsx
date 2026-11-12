import type { Metadata } from "next";

import FrameworkGuidePage, {
  generateMetadata as generateGuideMetadata,
} from "../../[slug]/page";

// React Router is the successor integration for the Remix package, so its
// canonical guide lives under Remix: /framework-guides/remix/react-router.
// The page body is the same data-driven guide; only the route and canonical
// URL differ from a top-level framework.
export function generateMetadata(): Promise<Metadata> {
  return generateGuideMetadata({
    params: Promise.resolve({ slug: "react-router" }),
  });
}

export default async function Page() {
  return FrameworkGuidePage({
    params: Promise.resolve({ slug: "react-router" }),
  });
}
