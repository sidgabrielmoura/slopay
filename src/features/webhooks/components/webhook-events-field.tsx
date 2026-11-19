"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { WebhookEventType } from "@/types/domain";
import { webhookEventGroups, webhookEvents } from "../webhooks";

type EventSelectionChange = (events: readonly WebhookEventType[], checked: boolean) => void;

function WebhookEventGroup({ group, selected, disabled, onChange }: {
  group: (typeof webhookEventGroups)[number];
  selected: ReadonlySet<WebhookEventType>;
  disabled: boolean;
  onChange: EventSelectionChange;
}) {
  const [open, setOpen] = useState(false);
  const selectedCount = group.events.filter((event) => selected.has(event)).length;
  const checked = selectedCount === group.events.length;
  const partial = selectedCount > 0 && !checked;
  const countId = `webhook-event-count-${group.id}`;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="flex min-w-0 items-center gap-1 bg-background/40 px-1">
        <Collapsible.Trigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground"
            aria-label={`${open ? "Recolher" : "Abrir"} eventos de ${group.label}`}>
            {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </Button>
        </Collapsible.Trigger>
        <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 pr-3 text-sm font-medium has-[:enabled]:cursor-pointer">
          <Checkbox
            checked={checked}
            disabled={disabled}
            aria-label={`Selecionar todos os eventos de ${group.label}`}
            aria-describedby={countId}
            ref={(input) => { if (input) input.indeterminate = partial; }}
            onChange={(event) => {
              const nextChecked = event.currentTarget.checked;
              onChange(group.events, nextChecked);
              if (nextChecked) setOpen(true);
            }}
          />
          <span className="min-w-0 flex-1 wrap-anywhere">{group.label}</span>
          <span id={countId} className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">{selectedCount} de {group.events.length}</span>
        </label>
      </div>
      <Collapsible.Content>
        <ul className="divide-y divide-border border-t pl-13 pr-3 sm:pl-16">
          {group.events.map((event) => {
            const { label, description } = webhookEvents[event];
            return (
              <li key={event}>
                <label className="flex min-h-11 min-w-0 items-center gap-2.5 py-2 has-[:enabled]:cursor-pointer">
                  <Checkbox checked={selected.has(event)} disabled={disabled}
                    onChange={(change) => onChange([event], change.currentTarget.checked)} />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-pretty text-xs text-muted-foreground">{description}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export function WebhookEventsField({ events, availableEvents, disabled, invalid, onChange }: {
  events: readonly WebhookEventType[];
  availableEvents?: readonly WebhookEventType[];
  disabled: boolean;
  invalid: boolean;
  onChange: EventSelectionChange;
}) {
  const selected = new Set(events);
  const groups = availableEvents
    ? webhookEventGroups.map((group) => ({ ...group, events: group.events.filter((event) => availableEvents.includes(event)) }))
      .filter((group) => group.events.length)
    : webhookEventGroups;

  return (
    <Card className="min-w-0" id="webhook-event" tabIndex={-1}>
      <fieldset className="grid min-w-0 gap-3 p-5" aria-labelledby="webhook-event-heading" aria-invalid={invalid || undefined}>
        <div className="grid gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="webhook-event-heading" className="text-balance text-lg font-semibold">Eventos enviados</h2>
            <p aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
              {selected.size} {selected.size === 1 ? "evento selecionado" : "eventos selecionados"}
            </p>
          </div>
          <p className="text-pretty text-sm text-muted-foreground">Marque um grupo inteiro ou use a seta para escolher eventos individuais.</p>
        </div>
        <div className="min-w-0 divide-y divide-border rounded-lg border">
          {groups.map((group) => (
            <WebhookEventGroup key={group.id} group={group} selected={selected} disabled={disabled} onChange={onChange} />
          ))}
        </div>
      </fieldset>
    </Card>
  );
}
