"use client";

import html2canvas from "html2canvas";

export type ScreenshotResult = {
  dataUrl: string; // data:image/png;base64,...
  width: number;
  height: number;
};

export async function captureViewport(target?: HTMLElement | null): Promise<ScreenshotResult> {
  const element = target ?? document.body;
  const canvas = await html2canvas(element, {
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    backgroundColor: null,
    scale: 1,
    logging: false,
    useCORS: true,
  });
  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, width: canvas.width, height: canvas.height };
}

export type UiAction =
  | { type: "click"; params: { x: number; y: number } }
  | { type: "type"; params: { text: string } }
  | { type: "key"; params: { key: string } }
  | { type: "wait"; params: { ms?: number } }
  | { type: "done"; params?: Record<string, unknown> };

// Map CUA actions to our UiAction
export function mapComputerCallToUiAction(action: any): UiAction | null {
  if (!action || typeof action !== "object") return null;
  switch (action.type) {
    case "click":
      return { type: "click", params: { x: Number(action.x ?? 0), y: Number(action.y ?? 0) } };
    case "type":
      return { type: "type", params: { text: String(action.text ?? "") } };
    case "keypress":
      return { type: "key", params: { key: String((action.keys?.[0] ?? action.key) ?? "Enter") } };
    case "wait":
      return { type: "wait", params: { ms: Number(action.ms ?? 300) } };
    default:
      return null;
  }
}

export async function executeUiAction(action: UiAction): Promise<{ ok: boolean; detail?: unknown }> {
  switch (action.type) {
    case "click": {
      const { x, y } = action.params;
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!el) return { ok: false, detail: "no element at point" };
      // Try to focus and dispatch proper mouse events for higher fidelity
      const rect = el.getBoundingClientRect();
      const clientX = Math.round(x);
      const clientY = Math.round(y);
      ["mousedown", "mouseup", "click"].forEach((type) => {
        el.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX,
            clientY,
          })
        );
      });
      return { ok: true };
    }
    case "type": {
      const { text } = action.params;
      const active = (document.activeElement as HTMLElement | null) ?? null;
      if (!active) return { ok: false, detail: "no active element" };
      const inputLike = active as HTMLInputElement | HTMLTextAreaElement;
      if ("value" in inputLike) {
        inputLike.value = (inputLike.value ?? "") + text;
        inputLike.dispatchEvent(new Event("input", { bubbles: true }));
        return { ok: true };
      }
      return { ok: false, detail: "active element not text-editable" };
    }
    case "key": {
      const { key } = action.params;
      const ev = new KeyboardEvent("keydown", { key, bubbles: true });
      document.dispatchEvent(ev);
      return { ok: true };
    }
    case "wait": {
      const { ms = 300 } = action.params ?? {};
      await new Promise((r) => setTimeout(r, ms));
      return { ok: true };
    }
    case "done":
      return { ok: true };
  }
}

