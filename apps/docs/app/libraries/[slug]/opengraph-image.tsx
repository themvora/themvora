import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgCard,
} from "../../../components/og/card";
import { libraries } from "../../../lib/libraries";

export const alt = "Themvora library adapter";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lib = libraries.find((l) => l.slug === slug);

  return renderOgCard({
    eyebrow: "Library adapter",
    title: lib?.name ?? "Themvora",
    description: lib?.tagline,
  });
}
