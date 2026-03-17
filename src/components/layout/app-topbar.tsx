"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ColorfulButton } from "@/components/ui/colorful-button";
import { SelectDropdown } from "@/components/ui/select-dropdown";

const WORKSPACE_OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "team", label: "Team" },
];

export function AppTopbar() {
  const [workspace, setWorkspace] = useState<string>("personal");

  return (
    <header
      data-skeleton
      data-testid="app-topbar"
      className="flex h-12 items-center gap-2 border-b border-border bg-background px-4"
    >
      {/* SKELETON — Ashton will source final app topbar design */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />

      {/* Workspace selector */}
      <SelectDropdown
        options={WORKSPACE_OPTIONS}
        value={workspace}
        onValueChange={setWorkspace}
        placeholder="Workspace"
        className="min-w-[130px]"
        triggerClassName="h-8 border-0 shadow-none hover:bg-secondary"
      />

      <div className="flex-1" />

      {/* Right actions */}
      <nav className="flex items-center gap-1">
        <button className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Bell size={16} />
        </button>
        <a
          href="#"
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          Help
        </a>
        <a
          href="#"
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          Docs
        </a>
        <ColorfulButton size="sm" glowColor="#2D5016">
          Upgrade
        </ColorfulButton>
      </nav>
    </header>
  );
}
