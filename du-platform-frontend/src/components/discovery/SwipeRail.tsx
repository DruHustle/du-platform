import {
  Children,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  label: string;
  children: ReactNode;
  wide?: boolean;
  resetKey?: string;
};
const initial = { index: 1, start: true, end: true };

/** Native touch scrolling with progressive controls; no autoplay or hidden slides. */
export default function SwipeRail({
  label,
  children,
  wide = false,
  resetKey,
}: Props) {
  const { t } = useTranslation();
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    active: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [position, setPosition] = useState(initial);
  const items = Children.toArray(children);

  useLayoutEffect(() => {
    const node = viewport.current;
    const row = track.current;
    if (!node || !row) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const tiles = Array.from(row.children) as HTMLElement[];
      const left = node.scrollLeft;
      const max = Math.max(0, node.scrollWidth - node.clientWidth);
      const edge =
        node.getBoundingClientRect().left +
        parseFloat(getComputedStyle(node).scrollPaddingLeft || "0");
      let index = 1;
      let nearest = Infinity;
      // Report the tile nearest the leading edge, including the final clamped stop.
      tiles.forEach((tile, i) => {
        const distance = Math.abs(tile.getBoundingClientRect().left - edge);
        if (distance < nearest) {
          nearest = distance;
          index = i + 1;
        }
      });
      const next = { index, start: left <= 2, end: left >= max - 2 };
      setPosition(previous =>
        previous.index === next.index &&
        previous.start === next.start &&
        previous.end === next.end
          ? previous
          : next
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const revealHash = () => {
      let target: HTMLElement | null = null;
      try {
        target = document.getElementById(
          decodeURIComponent(window.location.hash.slice(1))
        );
      } catch {
        return;
      }
      const tile = target?.closest<HTMLElement>(".swipe-rail-item");
      if (tile && node.contains(tile)) {
        node.scrollTo({
          left:
            tile.getBoundingClientRect().left -
            node.getBoundingClientRect().left +
            node.scrollLeft -
            parseFloat(getComputedStyle(node).scrollPaddingLeft || "0"),
          behavior: "instant",
        });
        measure();
      }
    };
    node.scrollTo({ left: 0, behavior: "instant" });
    revealHash();
    measure();
    node.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", revealHash);
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    observer.observe(row);
    return () => {
      node.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", revealHash);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items.length, resetKey]);

  const move = (direction: number) => {
    const node = viewport.current;
    const row = track.current;
    if (!node || !row) return;
    const stops = Array.from(row.children).map(
      tile =>
        tile.getBoundingClientRect().left -
        node.getBoundingClientRect().left +
        node.scrollLeft -
        parseFloat(getComputedStyle(node).scrollPaddingLeft || "0")
    );
    const next =
      direction > 0
        ? stops.find(left => left > node.scrollLeft + 8)
        : stops.findLast(left => left < node.scrollLeft - 8);
    node.scrollTo({
      left: next ?? (direction > 0 ? node.scrollWidth : 0),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const node = viewport.current;
    if (!node || drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (node.hasPointerCapture(event.pointerId))
      node.releasePointerCapture(event.pointerId);
    node.style.removeProperty("scroll-snap-type");
    delete node.dataset.dragging;
  };

  if (!items.length) return null;
  return (
    <div
      className={`swipe-rail${wide ? " swipe-rail-wide" : ""}`}
      data-swipe-rail={label}
    >
      <div className="swipe-rail-controls">
        <span className="swipe-rail-hint">
          {t("discovery.browse", {
            defaultValue: "Swipe or use the arrows to explore",
          })}
        </span>
        <div className="swipe-rail-actions">
          <span
            className="swipe-rail-position"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={t("discovery.position", {
              index: position.index,
              count: items.length,
              defaultValue: "Item {{index}} of {{count}}",
            })}
          >
            {position.index} / {items.length}
          </span>
          <button
            type="button"
            className="swipe-rail-arrow"
            aria-controls={id}
            disabled={position.start}
            aria-label={t("discovery.previous", {
              label,
              defaultValue: "Previous: {{label}}",
            })}
            onClick={() => move(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="swipe-rail-arrow"
            aria-controls={id}
            disabled={position.end}
            aria-label={t("discovery.next", {
              label,
              defaultValue: "Next: {{label}}",
            })}
            onClick={() => move(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        id={id}
        ref={viewport}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="swipe-rail-viewport"
        onKeyDown={event => {
          suppressClick.current = false;
          if (event.target !== event.currentTarget) return;
          if (
            (event.target as HTMLElement).closest(
              "input,select,textarea,[contenteditable=true]"
            )
          )
            return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
          if (
            event.target === event.currentTarget &&
            (event.key === "Home" || event.key === "End")
          ) {
            event.preventDefault();
            event.currentTarget.scrollTo({
              left: event.key === "Home" ? 0 : event.currentTarget.scrollWidth,
              behavior: "instant",
            });
          }
        }}
        onDragStart={event => event.preventDefault()}
        onClickCapture={event => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onPointerDown={event => {
          suppressClick.current = false;
          if (
            event.pointerType === "touch" ||
            event.button !== 0 ||
            (event.target as HTMLElement).closest(
              "input,select,textarea,[contenteditable=true]"
            )
          )
            return;
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            active: false,
          };
        }}
        onPointerMove={event => {
          if (event.buttons !== 1) {
            drag.current = null;
            return;
          }
          const state = drag.current;
          if (!state || state.id !== event.pointerId) return;
          const dx = event.clientX - state.x;
          const dy = event.clientY - state.y;
          if (
            !state.active &&
            Math.abs(dx) > 8 &&
            Math.abs(dx) > Math.abs(dy)
          ) {
            state.active = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.style.scrollSnapType = "none";
            event.currentTarget.dataset.dragging = "true";
          }
          if (state.active) {
            event.preventDefault();
            suppressClick.current = true;
            event.currentTarget.scrollLeft = state.left - dx;
          }
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div ref={track} role="list" className="swipe-rail-track">
          {items.map((item, index) => (
            <div
              role="listitem"
              className="swipe-rail-item"
              key={(item as { key?: string }).key ?? index}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
