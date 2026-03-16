"use client";

import { Mountain, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NAV_ITEMS, RESOURCE_ITEMS } from "@/lib/constants";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Mountain size={18} className="text-accent shrink-0" />
          <span className="font-semibold text-sm text-foreground group-data-[collapsible=icon]:hidden">
            Strange Grounds
          </span>
        </div>
        <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
          <button className="w-full flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-xs bg-muted rounded px-1 py-0.5 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const hrefPath = item.href.split("?")[0];
                const isActive =
                  hrefPath === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(hrefPath);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {RESOURCE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="What's New">
              <Bell size={18} />
              <span>What&apos;s New</span>
              <SidebarMenuBadge>3</SidebarMenuBadge>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-[10px] text-muted-foreground font-medium">
              A
            </span>
          </div>
          <span className="flex-1 truncate text-xs text-muted-foreground">
            user@strangegrounds.com
          </span>
        </div>
        <div className="flex justify-start px-2 pb-2">
          <SidebarTrigger />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
