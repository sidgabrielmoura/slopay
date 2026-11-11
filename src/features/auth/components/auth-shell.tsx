import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  children,
  contentMaxWidthClass = "max-w-[360px]",
  hideLogo = false,
}: {
  children: ReactNode;
  contentMaxWidthClass?: string;
  hideLogo?: boolean;
}) {
  return (
    <main className="grid min-h-dvh bg-background text-foreground lg:grid-cols-2">
      <div className="flex flex-col px-6 py-5 sm:px-8">
        {!hideLogo && (
          <Link href="/" className="inline-flex w-fit items-center gap-2 font-semibold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" aria-hidden="true" className="size-[22px] text-primary">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
            </svg>
            SloPay
          </Link>
        )}
        <div className={`mx-auto my-auto w-full py-8 ${contentMaxWidthClass}`}>{children}</div>
      </div>
      <div className="relative m-2 hidden overflow-hidden rounded-xl bg-card lg:block">
        <Image src="/images/login-hero2.jpg" alt="" fill preload sizes="50vw" className="object-cover" />
      </div>
    </main>
  );
}
