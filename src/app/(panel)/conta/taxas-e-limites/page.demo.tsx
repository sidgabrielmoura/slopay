import React, { Suspense } from "react";
import { TaxesAndLimitsScreen } from "@/features/account/components/taxes-and-limits-screen";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Taxas e limites",
};

export default function TaxasLimitesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <TaxesAndLimitsScreen />
    </Suspense>
  );
}
