import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { landingManagement } from "@/modules/landing-management/server";
import {
  LandingPreparationScreen,
  PublicLandingViewer,
} from "@/modules/landing-management/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const result = await landingManagement.getPublicLanding(slug);

  if (result.kind === "ready" || result.kind === "preparation") {
    return {
      title: `${result.restaurantName} | Sitio Oficial`,
      description: `Sitio web y carta digital de ${result.restaurantName}.`,
    };
  }

  return {
    title: "Página no encontrada",
    description: "La página solicitada no está disponible.",
  };
}

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const result = await landingManagement.getPublicLanding(slug);

  if (result.kind === "not_found" || result.kind === "disabled") {
    notFound();
  }

  if (result.kind === "preparation") {
    return (
      <LandingPreparationScreen
        restaurantName={result.restaurantName}
        menuSlug={result.menuSlug}
      />
    );
  }

  return (
    <PublicLandingViewer
      html={result.html}
      restaurantName={result.restaurantName}
    />
  );
}
