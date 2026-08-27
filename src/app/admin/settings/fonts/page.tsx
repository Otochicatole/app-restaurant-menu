import { getFontSelection, getFonts, setFontForTarget, deleteFont } from "@/features/fonts/backend/services/font.service";
import type { FontTarget } from "@/features/fonts/backend/types";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { FontSettingsClient, type FontActionResult } from "@/features/fonts/frontend/components/FontSettingsClient";
import { revalidatePath } from "next/cache";

export default async function AdminSettingsFontsPage() {
  const account = await ensureAdmin();
  const [fonts, selection] = await Promise.all([getFonts(account.tenantId!), getFontSelection(account.tenantId!)]);

  const activeFontId = Object.fromEntries(
    (Object.keys(selection) as FontTarget[]).map((target) => [target, selection[target]?.id ?? null]),
  ) as Record<FontTarget, string | null>;

  async function selectFont(target: FontTarget, fontId: string | null): Promise<FontActionResult> {
    "use server";
    try {
      const current = await ensureAdmin();
      await setFontForTarget(current.tenantId!, target, fontId);
      revalidatePath("/admin/settings/fonts");
      revalidatePath(`/m/${current.tenantSlug}`, "layout");
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo aplicar la fuente" } };
    }
  }

  async function removeFont(id: string): Promise<FontActionResult> {
    "use server";
    try {
      const current = await ensureAdmin();
      await deleteFont(current.tenantId!, id);
      revalidatePath("/admin/settings/fonts");
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo eliminar la fuente" } };
    }
  }

  const googleFonts = fonts.filter((font) => font.source === "google" && font.googleFamily);
  const customFonts = fonts.filter((font) => font.source === "custom" && font.filePath);

  return (
    <AdminLayout>
      {googleFonts.map((font) => (
        <link
          key={font.id}
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${font.googleFamily!.replace(/ /g, "+")}:wght@${font.weights}&display=swap`}
        />
      ))}
      {customFonts.length > 0 && (
        <style
          dangerouslySetInnerHTML={{
            __html: customFonts
                .map((font) => `@font-face{font-family:'${font.name}';src:url('/api/fonts/${font.id}/file');font-weight:400;font-style:normal;font-display:swap;}`)
              .join("\n"),
          }}
        />
      )}
      <FontSettingsClient
        fonts={fonts}
        activeFontId={activeFontId}
        selectFont={selectFont}
        removeFont={removeFont}
      />
    </AdminLayout>
  );
}
