import { useState, useEffect, useRef } from "react";
import { type InsertableInnerElementKind } from "../domain/landing-compiler";
import { landingWorkspace, type LandingSnapshot } from "./landing-workspace";
import { getDragWindow } from "./LandingLayerTree";

export function useLandingCanvasPort() {
  const store = landingWorkspace.useStore();
  const [isDraggingComponentOverCanvas, setIsDraggingComponentOverCanvas] = useState(false);
  const [draggedComponentKind, setDraggedComponentKind] =
    useState<InsertableInnerElementKind | null>(null);
  const [draggedBuiltinKey, setDraggedBuiltinKey] = useState<string | null>(null);
  const [draggedCustomId, setDraggedCustomId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const inlineEditingRef = useRef<boolean>(false);
  const inlineEditSnapshotRef = useRef<LandingSnapshot | null>(null);
  const pendingScrollBlockIdRef = useRef<string | null>(null);
  const pendingSubSelectorRef = useRef<string | null | undefined>(undefined);
  const iframeScrollYRef = useRef<number>(0);
  const draggedComponentKindRef =
    useRef<InsertableInnerElementKind | null>(null);
  const draggedBuiltinKeyRef = useRef<string | null>(null);
  const draggedCustomIdRef = useRef<string | null>(null);
  const selectedBlockIdRef = useRef(store.getState().selectedBlockId);
  const selectedSubElementRef = useRef(store.getState().selectedSubElement);
  const interactiveCanvasRef = useRef(store.getState().interactiveCanvas);

  useEffect(() => {
    const sync = () => {
      const state = store.getState();
      selectedBlockIdRef.current = state.selectedBlockId;
      selectedSubElementRef.current = state.selectedSubElement;
      interactiveCanvasRef.current = state.interactiveCanvas;
    };
    sync();
    return store.subscribe(sync);
  }, [store]);

  useEffect(() => {
    draggedComponentKindRef.current = draggedComponentKind;
  }, [draggedComponentKind]);
  useEffect(() => {
    draggedBuiltinKeyRef.current = draggedBuiltinKey;
  }, [draggedBuiltinKey]);
  useEffect(() => {
    draggedCustomIdRef.current = draggedCustomId;
  }, [draggedCustomId]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleGlobalDragEnd = () => {
      setIsDraggingComponentOverCanvas(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setDraggedComponentKind(null);
        setDraggedBuiltinKey(null);
        setDraggedCustomId(null);
        const win = getDragWindow();
        if (win) {
          win.__draggedComponentKind = null;
          win.__draggedBuiltinKey = null;
          win.__draggedCustomId = null;
        }
      }, 350);
    };
    window.addEventListener("dragend", handleGlobalDragEnd);
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { iframeRef, inlineEditingRef, inlineEditSnapshotRef, pendingScrollBlockIdRef, pendingSubSelectorRef, iframeScrollYRef, selectedBlockIdRef, selectedSubElementRef, interactiveCanvasRef, draggedComponentKindRef, draggedBuiltinKeyRef, draggedCustomIdRef, isDraggingComponentOverCanvas, setIsDraggingComponentOverCanvas, draggedComponentKind, setDraggedComponentKind, draggedBuiltinKey, setDraggedBuiltinKey, draggedCustomId, setDraggedCustomId };
}

export type LandingCanvasPort = ReturnType<typeof useLandingCanvasPort>;
