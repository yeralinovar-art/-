import { ImageResponse } from "next/og";

/** Иконка приложения: белый домик на зелёном фоне. Рисуется фигурами, без шрифтов. */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f7d6b",
        }}
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100">
          {/* домик с крышей */}
          <path d="M50 8 L94 46 L82 46 L82 92 L18 92 L18 46 L6 46 Z" fill="#ffffff" strokeLinejoin="round" />
          {/* дверь */}
          <path d="M40 92 L40 66 A10 10 0 0 1 60 66 L60 92 Z" fill="#c0693f" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
