import type { Metadata } from "next";

/** Formats a browser tab title placing the section before the restaurant or scope name. */
export function formatWindowTitle(section: string, scope?: string | null): string {
  const trimmed = scope?.trim();
  return trimmed ? `${section} · ${trimmed}` : section;
}

/** Resolves an absolute tab title safely without letting auth redirects crash metadata resolution. */
export async function resolveSectionMetadata(
  section: string,
  loadScope: () => Promise<string | null | undefined>,
  options: { absolute?: boolean } = { absolute: true },
): Promise<Metadata> {
  try {
    const label = formatWindowTitle(section, await loadScope());
    return { title: options.absolute ? { absolute: label } : label };
  } catch {
    return { title: options.absolute ? { absolute: section } : section };
  }
}

/** Builds inherited layout metadata so child pages automatically show `<Section> · <Restaurant>`. */
export async function resolveRestaurantLayoutMetadata(
  loadName: () => Promise<string | null | undefined>,
  defaultSection = "Editor",
): Promise<Metadata> {
  try {
    const name = (await loadName())?.trim();
    if (name) {
      return {
        title: {
          default: `${defaultSection} · ${name}`,
          template: `%s · ${name}`,
        },
      };
    }
  } catch {
    // Route components handle unauthorized or missing restaurant redirects/404s cleanly.
  }
  return {
    title: {
      default: defaultSection,
      template: "%s",
    },
  };
}

