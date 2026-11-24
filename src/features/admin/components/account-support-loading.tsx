import { ImageLoadingSurface } from "@/components/ui/image-loading";

export function AccountSupportLoading() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background p-4" role="status">
      <ImageLoadingSurface state="loading" className="absolute inset-0" />
      <span className="relative rounded-full border border-border bg-card px-5 py-3 text-lg font-semibold text-foreground shadow-lg">
        Acessando conta
      </span>
    </div>
  );
}
