import { renderAppIcon } from "@/lib/app-icon";

const SIZES = ["192", "512"] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: `${size}.png` }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[size]">) {
  const { size } = await params;
  return renderAppIcon(Number.parseInt(size, 10));
}
