/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaSelectorModal, type MediaSelectorTarget } from "./MediaSelectorModal";
import type { MenuAssetView } from "../contracts";

const sampleAssets: MenuAssetView[] = [
  {
    id: "img-1",
    name: "Burger Banner.jpg",
    kind: "IMAGE",
    url: "/media/img-1.jpg",
    mimeType: "image/jpeg",
    byteSize: 1024,
    width: 800,
    height: 600,
    fontFamily: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "img-2",
    name: "Salad Fresh.png",
    kind: "IMAGE",
    url: "/media/img-2.png",
    mimeType: "image/png",
    byteSize: 2048,
    width: 600,
    height: 400,
    fontFamily: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "vid-1",
    name: "Promo Video.mp4",
    kind: "VIDEO",
    url: "/media/vid-1.mp4",
    mimeType: "video/mp4",
    byteSize: 8192,
    width: 1920,
    height: 1080,
    fontFamily: null,
    createdAt: new Date().toISOString(),
  },
];

afterEach(cleanup);

describe("MediaSelectorModal", () => {
  it("renders target information for a text node with modal click role", () => {
    const target: MediaSelectorTarget = {
      nodeId: "text-1",
      nodeType: "text",
      nodeName: "Hamburguesa Doble",
      role: "modal",
      currentAssetId: "vid-1",
    };

    render(
      React.createElement(MediaSelectorModal, {
        target,
        assets: sampleAssets,
        isOpen: true,
        onClose: vi.fn(),
        onSelectAsset: vi.fn(),
        onRemoveAsset: vi.fn(),
        onUploadAsset: vi.fn(),
      })
    );

    // Target object identification
    expect(screen.getAllByText("Texto").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hamburguesa Doble").length).toBeGreaterThan(0);
    expect(screen.getByText("Multimedia emergente al hacer clic")).not.toBeNull();
    expect(screen.getByText(/Imágenes o videos/)).not.toBeNull();

    // Current assignment preview
    expect(screen.getByText("Asignado actualmente")).not.toBeNull();
    expect(screen.getAllByText("Promo Video.mp4").length).toBe(2);

    // Allows both images and videos
    expect(screen.getByText("Subir y asignar imagen")).not.toBeNull();
    expect(screen.getByText("Subir y asignar video")).not.toBeNull();

    // Filter tabs exist
    expect(screen.getByRole("button", { name: "Todos" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Fotos" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Videos" })).not.toBeNull();
  });

  it("restricts assets to images only for rectangle background target", () => {
    const target: MediaSelectorTarget = {
      nodeId: "shape-1",
      nodeType: "shape",
      nodeName: "Tarjeta Promo",
      role: "background",
      currentAssetId: null,
    };

    render(
      React.createElement(MediaSelectorModal, {
        target,
        assets: sampleAssets,
        isOpen: true,
        onClose: vi.fn(),
        onSelectAsset: vi.fn(),
        onRemoveAsset: vi.fn(),
        onUploadAsset: vi.fn(),
      })
    );

    // Target information
    expect(screen.getAllByText("Rectángulo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tarjeta Promo").length).toBeGreaterThan(0);
    expect(screen.getByText("Imagen de fondo del rectángulo")).not.toBeNull();
    expect(screen.getByText(/Solo imágenes/)).not.toBeNull();

    // Does NOT offer video upload or video assets
    expect(screen.getByText("Subir y asignar imagen")).not.toBeNull();
    expect(screen.queryByText("Subir y asignar video")).toBeNull();
    expect(screen.queryByText("Promo Video.mp4")).toBeNull();

    // Images are listed
    expect(screen.getByText("Burger Banner.jpg")).not.toBeNull();
    expect(screen.getByText("Salad Fresh.png")).not.toBeNull();
  });

  it("calls onSelectAsset when clicking an asset", async () => {
    const onSelectAsset = vi.fn();
    const target: MediaSelectorTarget = {
      nodeId: "text-1",
      nodeType: "text",
      nodeName: "Postre",
      role: "modal",
      currentAssetId: null,
    };

    render(
      React.createElement(MediaSelectorModal, {
        target,
        assets: sampleAssets,
        isOpen: true,
        onClose: vi.fn(),
        onSelectAsset,
        onRemoveAsset: vi.fn(),
        onUploadAsset: vi.fn(),
      })
    );

    const assignButtons = screen.getAllByRole("button", { name: "Asignar" });
    await userEvent.click(assignButtons[0]);
    expect(onSelectAsset).toHaveBeenCalledWith(sampleAssets[0]);
  });

  it("filters assets by search input", () => {
    const target: MediaSelectorTarget = {
      nodeId: "text-1",
      nodeType: "text",
      nodeName: "Bebidas",
      role: "modal",
      currentAssetId: null,
    };

    render(
      React.createElement(MediaSelectorModal, {
        target,
        assets: sampleAssets,
        isOpen: true,
        onClose: vi.fn(),
        onSelectAsset: vi.fn(),
        onRemoveAsset: vi.fn(),
        onUploadAsset: vi.fn(),
      })
    );

    const searchInput = screen.getByPlaceholderText("Buscar por nombre...");
    fireEvent.change(searchInput, { target: { value: "Salad" } });

    expect(screen.getByText("Salad Fresh.png")).not.toBeNull();
    expect(screen.queryByText("Burger Banner.jpg")).toBeNull();
  });

  it("calls onRemoveAsset when clicking Quitar", async () => {
    const onRemoveAsset = vi.fn();
    const target: MediaSelectorTarget = {
      nodeId: "text-1",
      nodeType: "text",
      nodeName: "Plato Principal",
      role: "modal",
      currentAssetId: "img-1",
    };

    render(
      React.createElement(MediaSelectorModal, {
        target,
        assets: sampleAssets,
        isOpen: true,
        onClose: vi.fn(),
        onSelectAsset: vi.fn(),
        onRemoveAsset,
        onUploadAsset: vi.fn(),
      })
    );

    const removeBtn = screen.getByTitle("Desvincular multimedia de este objeto");
    await userEvent.click(removeBtn);
    expect(onRemoveAsset).toHaveBeenCalledOnce();
  });
});
