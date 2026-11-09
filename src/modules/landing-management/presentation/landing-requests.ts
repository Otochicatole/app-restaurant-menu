import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type { ActionResult } from "@/platform/application/action-result";
import type { LandingEditorView } from "../application/landing-use-cases";
import type { LandingBlock, LandingDocumentV1, LandingTemplateView } from "../contracts";
import { compileLandingFromDocument, createDefaultLandingTemplate } from "../domain/landing-compiler";
import { getLandingRouteContext, markLandingContext, recontextualizeLandingDocument, recontextualizeLandingSource, rewriteLandingRoutes } from "../domain/landing-route-context";
import {
  createCustomLandingModuleAction, createLandingTemplateAction, deleteCustomLandingModuleAction,
  deletePrivateLandingTemplateAction, exportLandingTemplateAction, importLandingTemplateAction,
  publishLandingAction, saveLandingDraftAction,
} from "./actions";
import { landingEdited, landingLibraryRequestChanged, landingWorkspace, landingWriteFinished, landingWriteStarted } from "./landing-workspace";

export type LandingRestaurant = LandingEditorView["restaurant"];
type LandingStore = ReturnType<typeof landingWorkspace.makeStore>;
type State = ReturnType<LandingStore["getState"]>;
type LandingCommand<Result = void> = ThunkAction<Result, State, unknown, UnknownAction>;

export function compileLandingForSave(document: LandingDocumentV1, restaurant: LandingRestaurant) {
  const compiled = compileLandingFromDocument(document, {
    restaurantName: restaurant.name, restaurantSlug: restaurant.landingSlug, menuSlug: restaurant.slug,
  });
  return { ...compiled, htmlContent: markLandingContext(compiled.htmlContent, { menuSlug: restaurant.slug, landingSlug: restaurant.landingSlug }) };
}

export function writeLanding(restaurant: LandingRestaurant, publish: boolean): LandingCommand<Promise<void>> {
  return async (dispatch, getState) => {
    const current = getState();
    if (current.write) return;
    const { snapshot } = current;
    dispatch(landingWriteStarted());
    const id = getState().nextRequest;
    const failure = publish ? "Error al publicar la landing." : "No se pudo guardar el borrador.";
    try {
      const compiled = snapshot.document.mode === "visual" ? compileLandingForSave(snapshot.document, restaurant) : null;
      const command = {
        restaurantId: restaurant.id,
        document: snapshot.document,
        htmlContent: compiled?.htmlContent ?? snapshot.rawHtml,
        cssContent: compiled?.cssContent ?? snapshot.rawCss,
        jsContent: compiled?.jsContent ?? snapshot.rawJs,
      };
      const result = await (publish ? publishLandingAction(command) : saveLandingDraftAction(command));
      if (result.success) {
        dispatch(landingWriteFinished({
          id, updatedAt: result.data.updatedAt, published: publish,
          feedback: { type: "success", message: publish ? "¡Landing publicada en /l/" + restaurant.landingSlug + "!" : "Borrador guardado correctamente." },
        }));
      } else {
        dispatch(landingWriteFinished({ id, feedback: { type: "error", message: result.error.message || failure } }));
      }
    } catch {
      dispatch(landingWriteFinished({ id, feedback: { type: "error", message: failure } }));
    }
  };
}

export function applyLandingTemplate(restaurant: LandingRestaurant, template: LandingTemplateView): LandingCommand {
  return (dispatch) => {
    const current = { menuSlug: restaurant.slug, landingSlug: restaurant.landingSlug };
    const previous = getLandingRouteContext(template.htmlContent) ?? current;
    dispatch(landingEdited({
      snapshot: {
        document: recontextualizeLandingDocument(structuredClone(template.document), previous, current),
        rawHtml: recontextualizeLandingSource(template.htmlContent, current, previous),
        rawCss: rewriteLandingRoutes(template.cssContent, previous, current),
        rawJs: rewriteLandingRoutes(template.jsContent, previous, current),
      },
      recordHistory: true, resetSelection: true,
    }));
    dispatch(landingWorkspace.changed({ libraryDialog: null, feedback: { type: "success", message: 'Plantilla "' + template.name + '" aplicada.' } }));
  };
}

export function resetLanding(restaurant: LandingRestaurant): LandingCommand {
  return (dispatch) => {
    const starter = createDefaultLandingTemplate(restaurant.name, restaurant.landingSlug, restaurant.slug);
    dispatch(landingEdited({
      snapshot: { document: starter.document, rawHtml: starter.html, rawCss: starter.css, rawJs: starter.js },
      recordHistory: true, resetSelection: true,
    }));
    dispatch(landingWorkspace.changed({ feedback: { type: "success", message: "Diseño inicial restaurado." } }));
  };
}

function libraryRequest<T>(
  send: (state: State) => Promise<ActionResult<T>>,
  failure: string,
  apply?: (value: T, state: State) => Partial<State>,
): LandingCommand<Promise<T | undefined>> {
  return async (dispatch, getState) => {
    dispatch(landingLibraryRequestChanged(1));
    try {
      const result = await send(getState());
      if (result.success) {
        if (apply) dispatch(landingWorkspace.changed(apply(result.data, getState())));
        return result.data;
      }
      dispatch(landingWorkspace.changed({ feedback: { type: "error", message: result.error.message || failure } }));
    } catch {
      dispatch(landingWorkspace.changed({ feedback: { type: "error", message: failure } }));
    } finally {
      dispatch(landingLibraryRequestChanged(-1));
    }
  };
}

const success = (message: string) => ({ type: "success" as const, message });

export const saveLandingModule = (restaurantId: string, block: LandingBlock, name: string, description: string) =>
  libraryRequest(() => createCustomLandingModuleAction({
    restaurantId, name: name.trim(), description: description.trim(), category: "custom",
    fields: block.fields, htmlTemplate: block.htmlTemplate, cssTemplate: block.cssTemplate, jsTemplate: block.jsTemplate,
  }), "No se pudo guardar el módulo.", (module, state) => ({
    customModules: [module, ...state.customModules],
    ...(state.libraryDialog === "saveModule" ? { libraryDialog: null } : {}),
    feedback: success('Módulo "' + module.name + '" guardado en tu biblioteca.'),
  }));

export const removeLandingModule = (restaurantId: string, moduleId: string) =>
  libraryRequest(() => deleteCustomLandingModuleAction(restaurantId, moduleId), "No se pudo eliminar el módulo.", (_, state) => ({
    customModules: state.customModules.filter(({ id }) => id !== moduleId), feedback: success("Módulo eliminado de tu biblioteca."),
  }));

export const saveLandingTemplate = (restaurantId: string, name: string, description: string, submitPublic: boolean) =>
  libraryRequest((state) => createLandingTemplateAction({
    restaurantId, document: state.snapshot.document, command: { name: name.trim(), description: description.trim(), submitPublic },
  }), "No se pudo guardar la plantilla.", (template, state) => ({
    templates: [template, ...state.templates],
    ...(state.libraryDialog === "saveTemplate" ? { libraryDialog: null } : {}),
    feedback: success(submitPublic ? "Plantilla enviada a moderación para la comunidad." : "Plantilla privada guardada en tu biblioteca."),
  }));

export const removeLandingTemplate = (restaurantId: string, templateId: string) =>
  libraryRequest(() => deletePrivateLandingTemplateAction(restaurantId, templateId), "No se pudo eliminar la plantilla.", (_, state) => ({
    templates: state.templates.filter(({ id }) => id !== templateId), feedback: success("Plantilla eliminada."),
  }));

export const exportLandingTemplate = (restaurantId: string, templateId: string) =>
  libraryRequest(() => exportLandingTemplateAction(restaurantId, templateId), "No se pudo exportar la plantilla.");

export const importLandingTemplate = (restaurantId: string, base64: string) =>
  libraryRequest(() => importLandingTemplateAction(restaurantId, base64), "Archivo .landingtemplate inválido.", (template, state) => ({
    templates: [template, ...state.templates], feedback: success('Plantilla "' + template.name + '" importada a tu biblioteca.'),
  }));
