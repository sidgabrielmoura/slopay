"use client";

import { useQuery } from "@tanstack/react-query";
import { ToastNotice } from "@/components/ui/toast-notice";
import { queryKeys } from "@/lib/query-keys";
import { useGatewayService } from "@/providers/demo-provider";
import { ApprovalsQueue } from "./approvals-queue";

export function ApprovalsListScreen() {
  const service = useGatewayService();
  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: queryKeys.approvals("ALL"),
    queryFn: () => service.getApprovals(),
    retry: false,
  });

  return (
    <>
      <ToastNotice message={data && isError ? "Não foi possível atualizar a fila de aprovações." : null} />
      <ApprovalsQueue
        queue={data ? { state: "ready", requests: data.data } : { state: isError ? "error" : "loading" }}
        refresh={{ busy: isFetching, run: () => void refetch() }}
      />
    </>
  );
}
