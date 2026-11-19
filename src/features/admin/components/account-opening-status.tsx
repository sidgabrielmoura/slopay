import { Badge, type BadgeProps } from "@/components/ui/badge";
import { openingStatusLabels, type OpeningStatus } from "../account-openings";

const tone: Record<OpeningStatus, BadgeProps["variant"]> = {
  AWAITING_EMAIL: "secondary",
  AWAITING_MFA: "secondary",
  AWAITING_APPLICATION: "secondary",
  READY: "info",
  UNDER_REVIEW: "info",
  CHANGES_REQUESTED: "warning",
  RESUBMITTED: "info",
  LINKED: "success",
  REJECTED: "destructive",
  RESTRICTED: "warning",
  PILOT: "secondary",
};

export function AccountOpeningStatus({ status }: { status: OpeningStatus }) {
  return <Badge variant={tone[status]} className="w-fit max-w-full whitespace-normal">{openingStatusLabels[status]}</Badge>;
}
