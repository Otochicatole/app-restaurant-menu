import {
  deleteMenuFontAction,
  menuCustomization,
  selectMenuFontAction,
  type FontTarget,
} from "@/modules/menu-customization/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { FontSettingsClient } from "@/modules/menu-customization/ui";

export default async function AdminSettingsFontsPage() {
  const account = await requireTenantAdmin();
  const [fonts, selection] = await Promise.all([
    menuCustomization.listFonts(account.tenantId),
    menuCustomization.getFontSelection(account.tenantId),
  ]);

  const activeFontId = Object.fromEntries(
    (Object.keys(selection) as FontTarget[]).map((target) => [target, selection[target]?.id ?? null]),
  ) as Record<FontTarget, string | null>;

  const googleFonts = fonts.filter((font) => font.source === "google" && font.googleFamily);
  const customFonts = fonts.filter((font) => font.source === "custom" && font.hasFile);

  return (
    <>
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
                .map((font) => `@font-face{font-family:"${font.familyAlias}";src:url("/api/fonts/${font.id}/file");font-weight:400;font-style:normal;font-display:swap;}`)
              .join("\n"),
          }}
        />
      )}
      <FontSettingsClient
        fonts={fonts}
        activeFontId={activeFontId}
        selectFont={selectMenuFontAction}
        removeFont={deleteMenuFontAction}
      />
    </>
  );
}
