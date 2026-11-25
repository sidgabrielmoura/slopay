import Image from "next/image";
import { brandConfig } from "@/config/brand.config";
import { cn } from "@/lib/utils";

export function BrandImage({
  variant = "logo",
  decorative = false,
  className,
}: {
  variant?: "logo" | "symbol" | "graphite";
  decorative?: boolean;
  className?: string;
}) {
  const symbol = variant === "symbol";
  const file = variant === "graphite" ? "logo-graphite" : variant;

  return (
    <Image
      src={`/brand/${file}.svg`}
      alt={decorative ? "" : brandConfig.name}
      width={symbol ? 26 : 104}
      height={26}
      unoptimized
      loading="eager"
      className={cn("h-6 w-auto shrink-0", className)}
    />
  );
}
