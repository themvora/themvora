import type { Metadata } from "next";

import { docsUrl } from "../../lib/site";
import { ContactView } from "./contact-view";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/contact") },
  title: "Contact",
  description:
    "Talk to the people who build Themvora — technical support, bug reports, security disclosures and partnership enquiries.",
};

export default function ContactPage() {
  return <ContactView />;
}
