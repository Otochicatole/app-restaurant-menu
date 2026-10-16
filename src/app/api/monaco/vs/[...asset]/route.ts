import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

const MONACO_VS_ROOT = path.resolve(
  process.cwd(),
  "node_modules/monaco-editor/min/vs",
);

const MIME_TYPES: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ asset: string[] }> },
) {
  const { asset } = await params;
  if (!asset || asset.length === 0) {
    return new Response(null, { status: 404 });
  }

  const relativePath = asset.join("/");
  const resolvedPath = path.resolve(MONACO_VS_ROOT, relativePath);

  if (
    resolvedPath === MONACO_VS_ROOT ||
    !resolvedPath.startsWith(MONACO_VS_ROOT + path.sep)
  ) {
    return new Response(null, { status: 400 });
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    return new Response(null, { status: 404 });
  }

  try {
    const content = await fs.readFile(resolvedPath);
    return new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
