import { MIME_TYPES } from "@excalidraw/common";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import {
  copyBlobToClipboardAsPng,
  copyTextToSystemClipboard,
  copyToClipboard,
} from "@excalidraw/excalidraw/clipboard";
import { encodePngMetadata } from "@excalidraw/excalidraw/data/image";
import { getNonDeletedElements } from "@excalidraw/element";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";
import {
  restoreAppState,
  restoreElements,
} from "@excalidraw/excalidraw/data/restore";
import {
  exportToCanvas as _exportToCanvas,
  exportToSvg as _exportToSvg,
} from "@excalidraw/excalidraw/scene/export";

import type {
  ExcalidrawFrameLikeElement,
  NonDeleted,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

export { MIME_TYPES };

type ExportOpts = {
  /** 导出前先做还原(restored)处理 */
  elements: readonly NonDeletedExcalidrawElement[];
  appState?: Partial<Omit<AppState, "offsetTop" | "offsetLeft">>;
  files: BinaryFiles | null;
  maxWidthOrHeight?: number;
  exportingFrame?: NonDeleted<ExcalidrawFrameLikeElement> | null;
  getDimensions?: (
    width: number,
    height: number,
  ) => { width: number; height: number; scale?: number };
};

export const exportToCanvas = ({
  elements,
  appState,
  files,
  maxWidthOrHeight,
  getDimensions,
  exportPadding,
  exportingFrame,
}: ExportOpts & {
  exportPadding?: number;
}) => {
  const restoredElements = getNonDeletedElements(
    restoreElements(elements, null, {
      deleteInvisibleElements: true,
    }),
  );
  const restoredAppState = restoreAppState(appState, null);

  const { exportBackground, viewBackgroundColor } = restoredAppState;
  return _exportToCanvas(
    restoredElements,
    { ...restoredAppState, offsetTop: 0, offsetLeft: 0, width: 0, height: 0 },
    files || {},
    { exportBackground, exportPadding, viewBackgroundColor, exportingFrame },
    (width: number, height: number) => {
      const canvas = document.createElement("canvas");

      if (maxWidthOrHeight) {
        if (typeof getDimensions === "function") {
          console.warn(
            "`getDimensions()` is ignored when `maxWidthOrHeight` is supplied.",
          );
        }

        const max = Math.max(width, height);

        // 内容未超过 maxWidthOrHeight 时,回退使用调用方传入的缩放比例
        const scale =
          maxWidthOrHeight < max
            ? maxWidthOrHeight / max
            : appState?.exportScale ?? 1;

        canvas.width = width * scale;
        canvas.height = height * scale;

        return {
          canvas,
          scale,
        };
      }

      const ret = getDimensions?.(width, height) || { width, height };

      canvas.width = ret.width;
      canvas.height = ret.height;

      return {
        canvas,
        scale: ret.scale ?? 1,
      };
    },
  );
};

export const exportToBlob = async (
  opts: ExportOpts & {
    mimeType?: string;
    quality?: number;
    exportPadding?: number;
  },
): Promise<Blob> => {
  let { mimeType = MIME_TYPES.png, quality } = opts;

  if (mimeType === MIME_TYPES.png && typeof quality === "number") {
    console.warn(`"quality" will be ignored for "${MIME_TYPES.png}" mimeType`);
  }

  // MIME 类型拼写错误(标准写法应为 "jpeg")
  if (mimeType === "image/jpg") {
    mimeType = MIME_TYPES.jpg;
  }

  if (mimeType === MIME_TYPES.jpg && !opts.appState?.exportBackground) {
    console.warn(
      `Defaulting "exportBackground" to "true" for "${MIME_TYPES.jpg}" mimeType`,
    );
    opts = {
      ...opts,
      appState: { ...opts.appState, exportBackground: true },
    };
  }

  const canvas = await exportToCanvas(opts);

  quality = quality ? quality : /image\/jpe?g/.test(mimeType) ? 0.92 : 0.8;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          return reject(new Error("couldn't export to blob"));
        }
        if (
          blob &&
          mimeType === MIME_TYPES.png &&
          opts.appState?.exportEmbedScene
        ) {
          blob = await encodePngMetadata({
            blob,
            metadata: serializeAsJSON(
              // 注意:只要我们还在用 Scene 这个 hack,序列化时就必须传原始的、
              // 未克隆的元素,以保证 id 稳定不变(还原时保留原 id)
              restoreElements(opts.elements, null),
              opts.appState,
              opts.files || {},
              "local",
            ),
          });
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
};

export const exportToSvg = async ({
  elements,
  appState = getDefaultAppState(),
  files = {},
  exportPadding,
  renderEmbeddables,
  exportingFrame,
  skipInliningFonts,
  reuseImages,
}: Omit<ExportOpts, "getDimensions"> & {
  exportPadding?: number;
  renderEmbeddables?: boolean;
  skipInliningFonts?: true;
  reuseImages?: boolean;
}): Promise<SVGSVGElement> => {
  const restoredElements = getNonDeletedElements(
    restoreElements(elements, null, {
      deleteInvisibleElements: true,
    }),
  );
  const restoredAppState = restoreAppState(appState, null);

  const exportAppState = {
    ...restoredAppState,
    exportPadding,
  };

  return _exportToSvg(restoredElements, exportAppState, files, {
    exportingFrame,
    renderEmbeddables,
    skipInliningFonts,
    reuseImages,
  });
};

export const exportToClipboard = async (
  opts: ExportOpts & {
    mimeType?: string;
    quality?: number;
    type: "png" | "svg" | "json";
  },
) => {
  if (opts.type === "svg") {
    const svg = await exportToSvg(opts);
    await copyTextToSystemClipboard(svg.outerHTML);
  } else if (opts.type === "png") {
    await copyBlobToClipboardAsPng(exportToBlob(opts));
  } else if (opts.type === "json") {
    await copyToClipboard(
      getNonDeletedElements(restoreElements(opts.elements, null)),
      opts.files,
    );
  } else {
    throw new Error("Invalid export type");
  }
};
