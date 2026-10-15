// Оформление: как в телефоне, всегда светлая или всегда тёмная. Хранится в cookie,
// чтобы сервер сразу отдавал нужную тему без мигания.
export const THEME_COOKIE = "theme";
export const THEMES = [
  { value: "system", label: "Как в телефоне" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
] as const;
export type Theme = (typeof THEMES)[number]["value"];

export function parseTheme(v: string | undefined): Theme {
  return v === "light" || v === "dark" ? v : "system";
}

export const THEME_COLORS = { light: "#f6f3ee", dark: "#121412" } as const;
