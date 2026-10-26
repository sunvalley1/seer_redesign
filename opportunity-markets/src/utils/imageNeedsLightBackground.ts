const SAMPLE_SIZE = 64;
const ALPHA_TRANSPARENT = 128;
const LUMA_DARK = 80;
const MIN_TRANSPARENT_RATIO = 0.15;
const MIN_DARK_AMONG_OPAQUE = 0.6;

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * True when the image has meaningful transparency and opaque pixels are
 * mostly dark (e.g. black logos on transparent backgrounds).
 * Returns false on sampling failure so callers keep the default dark frame.
 */
export function imageNeedsLightBackground(
  image: CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
): boolean {
  try {
    const sourceW =
      'naturalWidth' in image && image.naturalWidth
        ? image.naturalWidth
        : image.width ?? 0;
    const sourceH =
      'naturalHeight' in image && image.naturalHeight
        ? image.naturalHeight
        : image.height ?? 0;
    if (!sourceW || !sourceH) return false;

    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    ctx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    let transparent = 0;
    let opaque = 0;
    let darkOpaque = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] ?? 0;
      if (a < ALPHA_TRANSPARENT) {
        transparent += 1;
        continue;
      }
      opaque += 1;
      const luma = luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      if (luma < LUMA_DARK) darkOpaque += 1;
    }

    const total = transparent + opaque;
    if (total === 0 || opaque === 0) return false;

    const transparentRatio = transparent / total;
    const darkRatio = darkOpaque / opaque;
    return (
      transparentRatio >= MIN_TRANSPARENT_RATIO &&
      darkRatio >= MIN_DARK_AMONG_OPAQUE
    );
  } catch {
    return false;
  }
}
