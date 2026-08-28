import { notFound } from "next/navigation";
import { getPublicMenu } from "@/modules/public-menu/server";
import { PublicMenuTheme } from "@/modules/public-menu/ui";
import { NotFoundError } from "@/platform/application/errors";

export const dynamic = "force-dynamic";

export default async function PublicMenuLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const menu = await requirePublicMenu((await params).slug);
  return <PublicMenuTheme theme={menu.theme}>{children}</PublicMenuTheme>;
}

async function requirePublicMenu(slug: string) {
  try {
    return await getPublicMenu(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
