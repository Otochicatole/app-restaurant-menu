import { LandingMediaModal } from "./LandingMediaModal";
import { landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant } from "./landing-requests";
import { type LandingDocumentCommands } from "./landing-document-commands";

export function LandingMediaDialog({ restaurant, commands }: { restaurant: LandingRestaurant; commands: LandingDocumentCommands }) {
  const { handleUpdateBlockValue, handleUpdateBlockValues, handleUpdateSubElementAttribute, handleUpdateSubElementStyle } = commands;
  const [selectedSubElement, setSelectedSubElement] = landingWorkspace.useField("selectedSubElement");
  const [mediaPickerTarget, setMediaPickerTarget] = landingWorkspace.useField("mediaPickerTarget");

  return (
    <>
{mediaPickerTarget && (
        <LandingMediaModal
          open={true}
          landingSlug={restaurant.landingSlug}
          restaurantId={restaurant.id}
          currentUrl={mediaPickerTarget.currentUrl}
          title={mediaPickerTarget.title}
          onClose={() => setMediaPickerTarget(null)}
          onSelectUrl={(url, altSuggestion) => {
            if (mediaPickerTarget.kind === "field") {
              handleUpdateBlockValue(
                mediaPickerTarget.blockId,
                mediaPickerTarget.fieldKey,
                url,
              );
            } else if (mediaPickerTarget.kind === "block-bg") {
              handleUpdateBlockValue(
                mediaPickerTarget.blockId,
                "__style_bgImage",
                url,
              );
            } else if (mediaPickerTarget.kind === "sub-img") {
              if (mediaPickerTarget.boundSrcField) {
                const patch: Record<string, string> = {
                  [mediaPickerTarget.boundSrcField]: url,
                };
                if (
                  altSuggestion &&
                  mediaPickerTarget.boundAltField &&
                  selectedSubElement &&
                  !selectedSubElement.currentAlt
                ) {
                  patch[mediaPickerTarget.boundAltField] = altSuggestion;
                }
                handleUpdateBlockValues(mediaPickerTarget.blockId, patch);
                setSelectedSubElement((prev) =>
                  prev &&
                  prev.blockId === mediaPickerTarget.blockId &&
                  prev.selector === mediaPickerTarget.selector
                    ? {
                        ...prev,
                        currentSrc: url,
                        ...(altSuggestion && !prev.currentAlt
                          ? { currentAlt: altSuggestion }
                          : {}),
                      }
                    : prev,
                );
              } else {
                handleUpdateSubElementAttribute(
                  mediaPickerTarget.blockId,
                  mediaPickerTarget.selector,
                  "src",
                  url,
                );
              }
            } else if (mediaPickerTarget.kind === "sub-bg") {
              handleUpdateSubElementStyle(
                mediaPickerTarget.blockId,
                mediaPickerTarget.selector,
                { backgroundImage: url },
              );
            }
            setMediaPickerTarget(null);
          }}
        />
      )}
</>
  );
}
