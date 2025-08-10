"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Bounds = { width: number; height: number } | null;

const WindowContainerContext = React.createContext<{
  getRect: () => DOMRect | null;
  bumpZ: () => number;
  topZ: number;
} | null>(null);

export type WindowContainerProps = React.HTMLAttributes<HTMLDivElement>;

export function WindowContainer({ className, children, ...props }: WindowContainerProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const zCounterRef = React.useRef<number>(100);
  const [topZ, setTopZ] = React.useState<number>(zCounterRef.current);

  const getRect = React.useCallback((): DOMRect | null => {
    const el = containerRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }, []);

  const bumpZ = React.useCallback((): number => {
    zCounterRef.current = zCounterRef.current + 1;
    setTopZ(zCounterRef.current);
    return zCounterRef.current;
  }, []);

  return (
    <WindowContainerContext.Provider value={{ getRect, bumpZ, topZ }}>
      <div
        ref={containerRef}
        data-window-container
        className={cn("relative w-full h-full", className)}
        {...props}
      >
        {children}
      </div>
    </WindowContainerContext.Provider>
  );
}

function useContainerBounds() {
  const ctx = React.useContext(WindowContainerContext);
  return ctx?.getRect ?? (() => null);
}

function useZOrder() {
  const ctx = React.useContext(WindowContainerContext);
  return { bumpZ: ctx?.bumpZ ?? (() => 1), topZ: ctx?.topZ ?? 1 };
}

export interface WindowProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  onClose?: () => void;
  // When this value changes, the window brings itself to front
  focusSignal?: number;
}

export function Window({
  className,
  children,
  title = "Window",
  initialX = 24,
  initialY = 24,
  initialWidth = 360,
  initialHeight = 220,
  minWidth = 240,
  minHeight = 120,
  focusSignal,
  ...props
}: WindowProps) {
  const getRect = useContainerBounds();
  const { bumpZ, topZ } = useZOrder();

  const [position, setPosition] = React.useState({ x: initialX, y: initialY });
  const [size, setSize] = React.useState({ width: initialWidth, height: initialHeight });
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState<
    | null
    | "right"
    | "left"
    | "top"
    | "bottom"
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
  >(null);
  const dragOffsetRef = React.useRef({ dx: 0, dy: 0 });
  const HEADER_HEIGHT_PX = 36; // 2.25rem at 16px base

  const [hidden, setHidden] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);
  const prevForMaximizeRef = React.useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const prevHeightForMinimizeRef = React.useRef<number | null>(null);
  const [animateNext, setAnimateNext] = React.useState(false);
  const isInteracting = isDragging || Boolean(isResizing);
  const [zIndex, setZIndex] = React.useState<number>(() => bumpZ());
  const isFocused = zIndex === topZ;

  // Bring to front when focusSignal changes
  React.useEffect(() => {
    if (focusSignal === undefined) return;
    setZIndex(bumpZ());
  }, [focusSignal, bumpZ]);

  React.useEffect(() => {
    if (!animateNext) return;
    const id = window.setTimeout(() => setAnimateNext(false), 320);
    return () => window.clearTimeout(id);
  }, [animateNext]);

  const clampToBounds = React.useCallback(
    (x: number, y: number, width: number, height: number) => {
      const rect = getRect();
      if (!rect) return { x, y };
      const maxX = Math.max(0, rect.width - width);
      const maxY = Math.max(0, rect.height - height);
      return {
        x: Math.min(Math.max(0, x), maxX),
        y: Math.min(Math.max(0, y), maxY),
      };
    },
    [getRect]
  );

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    // Avoid starting a drag if this pointerdown is part of a double-click (handled separately)
    if (e.detail >= 2) return;
    setIsDragging(true);
    setZIndex(bumpZ());
    const rect = getRect();
    const localX = rect ? e.clientX - rect.left : e.clientX;
    const localY = rect ? e.clientY - rect.top : e.clientY;
    dragOffsetRef.current = {
      dx: localX - position.x,
      dy: localY - position.y,
    };
  };

  const onResizePointerDown = (
    e: React.PointerEvent,
    direction:
      | "right"
      | "left"
      | "top"
      | "bottom"
      | "top-right"
      | "top-left"
      | "bottom-right"
      | "bottom-left"
  ) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setAnimateNext(false);
    setIsResizing(direction);
    setZIndex(bumpZ());
  };

  React.useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const rect = getRect();
      const localX = rect ? e.clientX - rect.left : e.clientX;
      const localY = rect ? e.clientY - rect.top : e.clientY;
      if (isDragging) {
        const nextX = localX - dragOffsetRef.current.dx;
        const nextY = localY - dragOffsetRef.current.dy;
        const clamped = clampToBounds(nextX, nextY, size.width, size.height);
        setPosition(clamped);
      } else if (isResizing) {
        if (!rect) return;
        if (isResizing === "right" || isResizing === "bottom-right" || isResizing === "top-right") {
          const maxWidth = Math.max(minWidth, rect.width - position.x);
          const desired = localX - position.x; // width based on pointer
          const newWidth = Math.max(minWidth, Math.min(maxWidth, desired));
          setSize((s) => ({ ...s, width: newWidth }));
        }
        if (isResizing === "left" || isResizing === "bottom-left" || isResizing === "top-left") {
          const minX = 0;
          const maxX = position.x + size.width - minWidth;
          const newX = Math.max(minX, Math.min(maxX, localX));
          const newWidth = Math.max(minWidth, size.width + (position.x - newX));
          setPosition((p) => ({ ...p, x: newX }));
          setSize((s) => ({ ...s, width: newWidth }));
        }
        if (
          isResizing === "bottom" ||
          isResizing === "bottom-right" ||
          isResizing === "bottom-left"
        ) {
          const maxHeight = Math.max(minHeight, rect.height - position.y);
          const desired = localY - position.y; // height based on pointer
          const newHeight = Math.max(minHeight, Math.min(maxHeight, desired));
          setSize((s) => ({ ...s, height: newHeight }));
        }
        if (isResizing === "top" || isResizing === "top-right" || isResizing === "top-left") {
          const minY = 0;
          const maxY = position.y + size.height - minHeight;
          const newY = Math.max(minY, Math.min(maxY, localY));
          const newHeight = Math.max(minHeight, size.height + (position.y - newY));
          setPosition((p) => ({ ...p, y: newY }));
          setSize((s) => ({ ...s, height: newHeight }));
        }
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      // Ensure position remains within bounds after interactions
      setPosition((p) => clampToBounds(p.x, p.y, size.width, size.height));
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [
    isDragging,
    isResizing,
    clampToBounds,
    getRect,
    minHeight,
    minWidth,
    position.x,
    position.y,
    size.width,
    size.height,
  ]);

  // Keep inside bounds if container size changes
  React.useEffect(() => {
    const ro = new ResizeObserver(() => {
      setPosition((p) => clampToBounds(p.x, p.y, size.width, size.height));
    });
    // Try to observe the nearest container element in DOM tree
    const containerEl = document?.querySelector?.("[data-window-container]") as HTMLElement | null;
    if (containerEl) ro.observe(containerEl);
    return () => ro.disconnect();
  }, [clampToBounds, size.width, size.height]);

  return hidden ? null : (
    <div
      className={cn(
        "absolute select-none rounded-xl bg-white/70 backdrop-blur-lg shadow-lg overflow-hidden flex flex-col",
        animateNext && !isInteracting && "transition-all duration-300 ease-out",
        isDragging && "cursor-grabbing",
        className
      )}
      style={{ left: position.x, top: position.y, width: size.width, height: size.height, zIndex }}
      {...props}
      onPointerDown={() => setZIndex(bumpZ())}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-white/40 text-muted-foreground cursor-grab active:cursor-grabbing"
        )}
        onPointerDown={onHeaderPointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const rect = getRect();
          if (!rect) return;
          setAnimateNext(true);
          if (!isMaximized) {
            prevForMaximizeRef.current = {
              x: position.x,
              y: position.y,
              width: size.width,
              height: size.height,
            };
            setPosition({ x: 0, y: 0 });
            setSize({ width: rect.width, height: rect.height });
            setIsMaximized(true);
            setIsMinimized(false);
          } else {
            const prev = prevForMaximizeRef.current;
            if (prev) {
              setPosition({ x: prev.x, y: prev.y });
              setSize({ width: prev.width, height: prev.height });
            }
            setIsMaximized(false);
          }
        }}
        aria-label="Drag window"
      >
        <div
          className="flex items-center gap-1.5 cursor-default"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (typeof props.onClose === "function") props.onClose();
              else setHidden(true);
            }}
            title="Close"
            className="size-3 rounded-full bg-red-500 hover:brightness-90 active:brightness-95 transition-all"
            aria-label="Close window"
          />
          <button
            type="button"
            onClick={() => {
              setAnimateNext(true);
              if (!isMinimized) {
                prevHeightForMinimizeRef.current = size.height;
                setSize((s) => ({ ...s, height: HEADER_HEIGHT_PX }));
                setIsMinimized(true);
              } else {
                const prev = prevHeightForMinimizeRef.current ?? initialHeight;
                setSize((s) => ({ ...s, height: prev }));
                setIsMinimized(false);
              }
            }}
            title="Minimize"
            className="size-3 rounded-full bg-yellow-400 hover:brightness-90 active:brightness-95 transition-all"
            aria-label="Minimize window"
          />
          <button
            type="button"
            onClick={() => {
              setAnimateNext(true);
              const rect = getRect();
              if (!rect) return;
              if (!isMaximized) {
                prevForMaximizeRef.current = {
                  x: position.x,
                  y: position.y,
                  width: size.width,
                  height: size.height,
                };
                setPosition({ x: 0, y: 0 });
                setSize({ width: rect.width, height: rect.height });
                setIsMaximized(true);
                setIsMinimized(false);
              } else {
                const prev = prevForMaximizeRef.current;
                if (prev) {
                  setPosition({ x: prev.x, y: prev.y });
                  setSize({ width: prev.width, height: prev.height });
                }
                setIsMaximized(false);
              }
            }}
            title="Maximize"
            className="size-3 rounded-full bg-green-500 hover:brightness-90 active:brightness-95 transition-all"
            aria-label="Maximize window"
          />
        </div>
        <span
          className={cn(
            "text-xs truncate tracking-wide px-2 flex-1 min-w-0 text-center mr-12",
            isFocused ? "font-bold" : "font-medium"
          )}
        >
          {title}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      {/* Resize handles */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-ew-resize"
        onPointerDown={(e) => onResizePointerDown(e, "right")}
        aria-label="Resize right"
      />
      <div
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize"
        onPointerDown={(e) => onResizePointerDown(e, "left")}
        aria-label="Resize left"
      />
      <div
        className="absolute left-0 bottom-0 w-full h-1 cursor-ns-resize"
        onPointerDown={(e) => onResizePointerDown(e, "bottom")}
        aria-label="Resize bottom"
      />
      <div
        className="absolute left-0 top-0 w-full h-1 cursor-ns-resize"
        onPointerDown={(e) => onResizePointerDown(e, "top")}
        aria-label="Resize top"
      />
      <div
        className="absolute right-0 bottom-0 size-3 cursor-nwse-resize"
        onPointerDown={(e) => onResizePointerDown(e, "bottom-right")}
        aria-label="Resize corner"
      />
      <div
        className="absolute left-0 bottom-0 size-3 cursor-nesw-resize"
        onPointerDown={(e) => onResizePointerDown(e, "bottom-left")}
        aria-label="Resize corner"
      />
      <div
        className="absolute right-0 top-0 size-3 cursor-nesw-resize"
        onPointerDown={(e) => onResizePointerDown(e, "top-right")}
        aria-label="Resize corner"
      />
      <div
        className="absolute left-0 top-0 size-3 cursor-nwse-resize"
        onPointerDown={(e) => onResizePointerDown(e, "top-left")}
        aria-label="Resize corner"
      />
    </div>
  );
}

export default Window;
