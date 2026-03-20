"use client";

type RGB = {
  r: number;
  g: number;
  b: number;
};

export async function extractPaletteFromImage(imageUrl: string) {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is unavailable.");
  }

  const width = 80;
  const height = Math.max(1, Math.round((image.height / image.width) * width));
  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  const buckets = new Map<string, { count: number; rgb: RGB }>();

  for (let index = 0; index < data.length; index += 16) {
    const alpha = data[index + 3];
    if (alpha < 128) {
      continue;
    }

    const rgb = {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2]
    };

    const bucketKey = `${Math.round(rgb.r / 32) * 32}-${Math.round(rgb.g / 32) * 32}-${Math.round(
      rgb.b / 32
    ) * 32}`;
    const existing = buckets.get(bucketKey);

    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(bucketKey, { count: 1, rgb });
    }
  }

  const sorted = [...buckets.values()]
    .filter((bucket) => !isNearWhite(bucket.rgb) && !isNearBlack(bucket.rgb))
    .sort((a, b) => b.count - a.count)
    .map((bucket) => rgbToHex(bucket.rgb));

  const palette = [...new Set(sorted)];

  return {
    primary: palette[0] ?? "#123A69",
    secondary: palette[1] ?? "#86201A",
    accent: palette[2] ?? "#E7B55E"
  };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image for color extraction."));
    image.src = url;
  });
}

function rgbToHex({ r, g, b }: RGB) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function isNearWhite({ r, g, b }: RGB) {
  return r > 235 && g > 235 && b > 235;
}

function isNearBlack({ r, g, b }: RGB) {
  return r < 25 && g < 25 && b < 25;
}
