import { getActiveFont, getFonts, setActiveFont, deleteFont } from "@/features/fonts/backend/services/font.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { FontSettingsClient, type FontActionResult } from "@/features/fonts/frontend/components/FontSettingsClient";
import { revalidatePath } from "next/cache";

export default async function AdminSettingsFontsPage() {
  const [fonts, activeFont] = await Promise.all([getFonts(), getActiveFont()]);

  async function selectFont(fontId: string | null): Promise<FontActionResult> {
    "use server";
    try {
      await ensureAdmin();
      await setActiveFont(fontId);
      revalidatePath("/admin/settings/fonts");
      revalidatePath("/", "layout");
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo aplicar la fuente" } };
    }
  }

  async function removeFont(id: string): Promise<FontActionResult> {
    "use server";
    try {
      await ensureAdmin();
      await deleteFont(id);
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
        activeFontId={activeFont?.id ?? null}
        selectFont={selectFont}
        removeFont={removeFont}
      />
    </AdminLayout>
  );
}
