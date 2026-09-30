import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Без ключей Supabase пропускаем запрос: страницы покажут инструкцию по настройке.
  if (!isSupabaseConfigured) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    // Всё, кроме статики, иконок, манифеста, service worker и API.
    "/((?!api|_next/static|_next/image|icons|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
