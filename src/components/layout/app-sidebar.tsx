"use client";

import { Mountain, House, PlusCircle, Bookmark, Map, Database, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: typeof House;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: House },
  { href: "/app?new=true", label: "New Trip", icon: PlusCircle },
  { href: "/app/saved", label: "Saved Trips", icon: Bookmark },
  { href: "/app/routes", label: "Popular Routes", icon: Map },
  { href: "/app/sources", label: "Data Sources", icon: Database },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function AnimatedLabel({ children, open }: { children: React.ReactNode; open: boolean }) {
  return (
    <motion.span
      animate={{
        display: open ? "inline-block" : "none",
        opacity: open ? 1 : 0,
      }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className="whitespace-pre truncate"
    >
      {children}
    </motion.span>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, setOpen } = useSidebar();
  const isOpen = state === "expanded";

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Mountain size={18} className="text-accent shrink-0" />
          <AnimatedLabel open={isOpen}>
            <span className="font-semibold text-sm text-foreground font-[family-name:var(--font-dm-sans)]">
              Strange Grounds
            </span>
          </AnimatedLabel>
        </div>
        <motion.div
          animate={{
            display: isOpen ? "block" : "none",
            opacity: isOpen ? 1 : 0,
          }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="px-2 pb-2"
        >
          <button className="w-full flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-xs bg-muted rounded px-1 py-0.5 font-mono">
              ⌘K
            </kbd>
          </button>
        </motion.div>
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
                        <AnimatedLabel open={isOpen}>
                          {item.label}
                        </AnimatedLabel>
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
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="size-6 rounded-full bg-accent flex items-center justify-center shrink-0">
            <span className="text-[10px] text-white font-medium">
              A
            </span>
          </div>
          <AnimatedLabel open={isOpen}>
            <span className="truncate text-xs text-muted-foreground">
              user@strangegrounds.com
            </span>
          </AnimatedLabel>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
