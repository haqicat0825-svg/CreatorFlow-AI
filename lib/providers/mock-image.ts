import type { ImageAdapterConfig, ImageGenerationAdapter, ImageGenerationRequest } from "./image-types";

const PALETTES = [
  ["#f4c7b8", "#f5eadf", "#8ca59b"],
  ["#c7d5e8", "#efe2d2", "#ba7d6d"],
  ["#dfc5d8", "#f6efe5", "#728b82"],
  ["#e7c9a8", "#d9e3dc", "#9c7183"],
];

export function createMockImageAdapter(config: ImageAdapterConfig): ImageGenerationAdapter {
  return {
    id: "mock-image",
    model: config.model,
    async generateImage(request: ImageGenerationRequest) {
      const dimensions = dimensionsFor(request.aspectRatio);
      const generationId = crypto.randomUUID();
      return {
        images: Array.from({ length: request.candidateCount }, (_, index) => ({
          id: `${generationId}-${index + 1}`,
          url: mockSvgUrl(PALETTES[index % PALETTES.length], dimensions.width, dimensions.height, index + 1),
          width: dimensions.width,
          height: dimensions.height,
          mimeType: "image/svg+xml",
        })),
        provider: "mock",
        model: config.model,
        isMock: true,
        revisedPrompt: request.prompt,
        safetyWarnings: [],
        generationId,
      };
    },
  };
}

function dimensionsFor(ratio: ImageGenerationRequest["aspectRatio"]) {
  if (ratio === "1:1") return { width: 1024, height: 1024 };
  if (ratio === "4:3") return { width: 1536, height: 1024 };
  return { width: 1024, height: 1536 };
}

function mockSvgUrl(colors: string[], width: number, height: number, index: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset=".52" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${width * .68}" cy="${height * .34}" r="${Math.min(width, height) * .22}" fill="white" opacity=".28"/><rect x="${width * .12}" y="${height * .65}" width="${width * .76}" height="${height * .18}" rx="48" fill="white" opacity=".38"/><text x="${width / 2}" y="${height * .91}" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#3d3431">CREATORFLOW DEMO ${index}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
