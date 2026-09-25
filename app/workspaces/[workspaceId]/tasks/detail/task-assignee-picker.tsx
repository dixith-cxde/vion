"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MemberOption } from "./task-constants";

export function formatMemberLabel(m: { name: string | null; email: string | null }) {
  return m.name ?? m.email ?? "Unknown";
}

export function AssignedToPicker({
  members,
  value,
  onChange,
  selectedMember,
  disabled,
}: {
  members: MemberOption[];
  value: string | null;
  onChange: (v: string | null) => void;
  selectedMember: MemberOption | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={(nextOpen) => (!disabled ? setOpen(nextOpen) : null)}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          className="h-8 w-full justify-between rounded-lg border border-cyan-100 bg-cyan-50 px-3 text-[11px] font-medium text-cyan-700 shadow-none hover:bg-cyan-100 hover:text-cyan-700"
        >
          <span className="truncate">
            {selectedMember ? formatMemberLabel(selectedMember.user) : "Unassigned"}
          </span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
              No members found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="unassigned"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="gap-2 text-xs"
              >
                <Check className={cn("size-3.5", !value ? "opacity-100" : "opacity-0")} />
                Unassigned
              </CommandItem>
              {members.map((member) => (
                <CommandItem
                  key={member.user.id}
                  value={formatMemberLabel(member.user)}
                  onSelect={() => {
                    onChange(member.user.id);
                    setOpen(false);
                  }}
                  className="gap-2 text-xs"
                >
                  <Check
                    className={cn(
                      "size-3.5",
                      value === member.user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {formatMemberLabel(member.user)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
