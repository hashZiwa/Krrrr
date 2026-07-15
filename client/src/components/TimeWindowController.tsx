import { useRef, useState, type PointerEvent } from "react";
import { formatTimeLabel } from "../data/chartTransforms";
import type { TimeWindow } from "../data/timeWindow";

type TimeWindowControllerProps = {
  window: TimeWindow;
  domainStart: number;
  domainEnd: number;
  onPan: (deltaMs: number) => void;
};

const STEP_MS = 30 * 60_000;

export function TimeWindowController({ window, domainStart, domainEnd, onPan }: TimeWindowControllerProps) {
  const dragStartX = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const canPanLeft = window.start > domainStart;
  const canPanRight = window.end < domainEnd;
  const domainWidth = Math.max(1, domainEnd - domainStart);
  const windowWidth = window.end - window.start;
  const trackWidthPercent = Math.max(8, (windowWidth / domainWidth) * 100);
  const trackOffsetPercent = ((window.start - domainStart) / domainWidth) * 100;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const deltaPx = event.clientX - dragStartX.current;
    const deltaMs = (deltaPx / rect.width) * domainWidth;

    onPan(deltaMs);
    dragStartX.current = event.clientX;
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="time-window-controller" aria-label="표시 시간 구간">
      <button type="button" onClick={() => onPan(-STEP_MS)} disabled={!canPanLeft} aria-label="이전 시간 구간">
        &larr;
      </button>
      <span>
        {formatTimeLabel(window.start)} - {formatTimeLabel(window.end)}
      </span>
      <button type="button" onClick={() => onPan(STEP_MS)} disabled={!canPanRight} aria-label="다음 시간 구간">
        &rarr;
      </button>
      <div
        className={`time-window-track ${isDragging ? "time-window-track--dragging" : ""}`}
        role="slider"
        aria-valuemin={domainStart}
        aria-valuemax={domainEnd}
        aria-valuenow={window.start}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className="time-window-track__thumb"
          style={{
            width: `${trackWidthPercent}%`,
            left: `${trackOffsetPercent}%`,
          }}
        />
      </div>
    </div>
  );
}
