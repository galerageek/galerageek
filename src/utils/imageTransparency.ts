/**
 * Advanced image processing utilities to clean up store logos,
 * eradicate white background halos (defringing), and adapt logos
 * seamlessly to the dark theme (#020617) of Galera Geek.
 */

export interface DefringeOptions {
  /** Sensitivity tolerance: 10 to 80 (default 35) */
  tolerance?: number;
  /** Whether to aggressively de-fringe/un-multiply white halos (default true) */
  defringe?: boolean;
  /** Edge contraction/erosion in pixels to kill JPEG compression artifacts (0, 1, or 2, default 1) */
  erosion?: number;
  /** If set, replaces background and halo with exact RGB color instead of transparency */
  replaceColor?: [number, number, number]; // e.g. [2, 6, 23] for #020617
  /** Invert colors (useful for dark/black logos that become invisible on dark backgrounds) */
  invert?: boolean;
}

/**
 * Inspects corner pixels to check if image has a light or white background.
 */
export async function detectWhiteBackground(imageSrc: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(false);

        ctx.drawImage(img, 0, 0);
        const w = canvas.width;
        const h = canvas.height;
        const testPoints = [
          [2, 2],
          [w - 3, 2],
          [2, h - 3],
          [w - 3, h - 3],
          [Math.floor(w / 2), 2],
          [2, Math.floor(h / 2)],
        ];

        let lightCount = 0;
        for (const [x, y] of testPoints) {
          if (x >= 0 && y >= 0 && x < w && y < h) {
            const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
            // Check if light (brightness > 210) and not transparent
            if (a > 120 && (r + g + b) / 3 > 210) {
              lightCount++;
            }
          }
        }
        resolve(lightCount >= 3);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = imageSrc;
  });
}

/**
 * Removes white/light backgrounds from an image with professional halo de-fringing
 * to prevent the milky/light shadow around logos on dark backgrounds.
 */
export async function removeWhiteBackground(
  imageSrc: string,
  options: DefringeOptions = {}
): Promise<string> {
  const tolerance = options.tolerance ?? 35;
  const defringe = options.defringe !== false;
  const erosion = options.erosion ?? 1;
  const replaceColor = options.replaceColor;
  const invert = options.invert ?? false;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return reject(new Error('Canvas 2D context not available'));

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Step 1: Detect background color from edge borders
        let bgR = 255;
        let bgG = 255;
        let bgB = 255;

        let cornerSamples = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;

        const corners = [
          [1, 1], [width - 2, 1], [1, height - 2], [width - 2, height - 2],
          [Math.floor(width / 2), 1], [1, Math.floor(height / 2)]
        ];

        for (const [cx, cy] of corners) {
          const idx = (cy * width + cx) * 4;
          if (data[idx + 3] > 100) {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            cornerSamples++;
          }
        }

        if (cornerSamples > 0) {
          bgR = sumR / cornerSamples;
          bgG = sumG / cornerSamples;
          bgB = sumB / cornerSamples;
        }

        // Distance threshold in color space
        const maxDist = Math.max(15, tolerance * 3.5);
        const featherRange = maxDist * 0.4;

        // Keep track of alpha mask for erosion
        const alphaMask = new Uint8Array(width * height);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const pixelIdx = y * width + x;
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            let a = data[i + 3];

            if (a === 0) {
              alphaMask[pixelIdx] = 0;
              continue;
            }

            // Euclidean distance to detected background color
            const dr = r - bgR;
            const dg = g - bgG;
            const db = b - bgB;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);

            // Also check pure luminance distance to white
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            const isHighBrightness = luminance > (255 - tolerance * 1.5);

            if (dist < maxDist || (isHighBrightness && Math.max(r, g, b) - Math.min(r, g, b) < 25)) {
              if (dist <= maxDist - featherRange) {
                // Completely background
                a = 0;
              } else {
                // Feathered transitional edge
                const factor = (dist - (maxDist - featherRange)) / featherRange;
                a = Math.round(a * Math.max(0, Math.min(1, factor)));
              }
            }

            // Invert colors if requested
            if (invert && a > 0) {
              r = 255 - r;
              g = 255 - g;
              b = 255 - b;
            }

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
            alphaMask[pixelIdx] = a;
          }
        }

        // Step 2: Edge Erosion to kill JPEG compression ringing/halos
        if (erosion > 0) {
          const erodedMask = new Uint8Array(alphaMask);
          for (let y = erosion; y < height - erosion; y++) {
            for (let x = erosion; x < width - erosion; x++) {
              const idx = y * width + x;
              if (alphaMask[idx] > 0 && alphaMask[idx] < 250) {
                // Check neighbors
                let minNeighbor = 255;
                for (let dy = -erosion; dy <= erosion; dy++) {
                  for (let dx = -erosion; dx <= erosion; dx++) {
                    const nIdx = (y + dy) * width + (x + dx);
                    if (alphaMask[nIdx] < minNeighbor) {
                      minNeighbor = alphaMask[nIdx];
                    }
                  }
                }
                if (minNeighbor === 0) {
                  erodedMask[idx] = 0;
                }
              }
            }
          }

          for (let idx = 0; idx < width * height; idx++) {
            data[idx * 4 + 3] = erodedMask[idx];
          }
        }

        // Step 3: Professional De-Fringing (Un-multiply white background)
        // This is what completely eliminates the milky "sombreado bem claro"
        if (defringe) {
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a > 0 && a < 255) {
              const alphaNorm = a / 255;
              // Remove the white/light background contribution from semi-transparent edges
              let r = Math.round((data[i] - (1 - alphaNorm) * bgR) / alphaNorm);
              let g = Math.round((data[i + 1] - (1 - alphaNorm) * bgG) / alphaNorm);
              let b = Math.round((data[i + 2] - (1 - alphaNorm) * bgB) / alphaNorm);

              data[i] = Math.max(0, Math.min(255, r));
              data[i + 1] = Math.max(0, Math.min(255, g));
              data[i + 2] = Math.max(0, Math.min(255, b));
            }
          }
        }

        // Step 4: If replaceColor is requested (solid match to #020617)
        if (replaceColor) {
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a === 0) {
              data[i] = replaceColor[0];
              data[i + 1] = replaceColor[1];
              data[i + 2] = replaceColor[2];
              data[i + 3] = 255; // Solid page color
            } else if (a < 255) {
              // Blend smoothly into replaceColor
              const factor = a / 255;
              data[i] = Math.round(data[i] * factor + replaceColor[0] * (1 - factor));
              data[i + 1] = Math.round(data[i + 1] * factor + replaceColor[1] * (1 - factor));
              data[i + 2] = Math.round(data[i + 2] * factor + replaceColor[2] * (1 - factor));
              data[i + 3] = 255;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
}

/**
 * Replaces white background and halos with the exact page background color (#020617)
 */
export async function matchPageBackgroundColor(imageSrc: string): Promise<string> {
  return removeWhiteBackground(imageSrc, {
    tolerance: 40,
    defringe: true,
    erosion: 1,
    replaceColor: [2, 6, 23], // #020617 (slate-950)
  });
}
