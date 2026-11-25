import { ImageLoadingSurface } from "@/components/ui/image-loading";

export function AccountSupportLoading() {
  return (
    <div
      role="status"
      className="pointer-events-auto fixed inset-0 z-100 grid place-items-center overflow-y-auto bg-background px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] py-[max(1rem,env(safe-area-inset-top),env(safe-area-inset-bottom))]"
    >
      <div className="flex min-w-0 flex-col items-center gap-4 text-center">
        <div aria-hidden="true">
          <ImageLoadingSurface state="loading" className="size-16 rounded-xl border border-border" />
        </div>
        <p className="text-balance text-lg font-medium text-foreground">Acessando conta</p>
      </div>
    </div>
  );
}
