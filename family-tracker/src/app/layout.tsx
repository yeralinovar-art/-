import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { THEME_COLORS, THEME_COOKIE, parseTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Семья",
  description: "Семейное меню, питание, вес, активность и дела — для нас двоих.",
  applicationName: "Семья",
  appleWebApp: {
    capable: true,
    title: "Семья",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
            { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
          ]
        : THEME_COLORS[theme],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="ru" className="h-full antialiased" data-theme={theme === "system" ? undefined : theme}>
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
