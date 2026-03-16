"use client";

import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AppTopbar() {
  return (
    <header
      data-testid="app-topbar"
      className="flex h-12 items-center gap-2 border-b border-border bg-background px-4"
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />

      {/* Workspace selector */}
      <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
        Personal
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

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
        <Button
          size="sm"
          className="bg-accent text-white hover:bg-accent/90 rounded-md"
        >
          Upgrade
        </Button>
      </nav>
    </header>
  );
}
