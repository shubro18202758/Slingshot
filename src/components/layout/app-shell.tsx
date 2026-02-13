"use client";

import {
  BookOpen,
  ChevronDown,
  FileText,
  Home,
  Laptop,
  Layout,
  Layout as LayoutIcon,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Target,
  Users,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { CommandMenu } from "./command-menu";
import { useFocusStore } from "@/hooks/use-focus-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { QuickCapture } from "@/components/dashboard/quick-capture";

// Navigation items for the sidebar
const mainNav = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Profile", href: "/profile", icon: Users }, // Reusing Users icon or finding a better one like UserCircle if available, but Users is fine or I can import User
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Research", href: "/research", icon: Search },
  { name: "Events", href: "/events", icon: Zap },
  { name: "Opportunities", href: "/dashboard/opportunities", icon: Target },
  { name: "Tasks", href: "/tasks", icon: Layout },
  { name: "Command Center", href: "/command-center", icon: LayoutDashboard },
  { name: "Team", href: "/team", icon: Users }, // Keep Team as Users
  { name: "Settings", href: "/settings", icon: Settings },
];

function SyncStatusIndicator() {
  const [isSyncing, setIsSyncing] = React.useState(false);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsSyncing((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <RefreshCw
        className={cn(
          "h-3.5 w-3.5 transition-all duration-500",
          isSyncing ? "animate-spin text-purple-400" : "text-emerald-400"
        )}
      />
      <span className="text-muted-foreground hidden sm:inline text-xs">
        {isSyncing ? "Syncing..." : "Synced"}
      </span>
    </div>
  );
}

function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
        <DropdownMenuItem onClick={() => setTheme("light")}><Sun className="mr-2 h-4 w-4" /> Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}><Moon className="mr-2 h-4 w-4" /> Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}><Laptop className="mr-2 h-4 w-4" /> System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
      <SidebarHeader className="border-b border-white/5 pb-4 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/">
                <div className="relative flex aspect-square size-10 items-center justify-center rounded-xl bg-slate-950 border border-white/10 shadow-[0_0_30px_-5px_purple] group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 opacity-20 group-hover:opacity-40 transition-opacity" />
                  <Zap className="size-5 text-cyan-400 relative z-10" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none ml-2">
                  <span className="font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 text-lg">NEXUS</span>
                  <span className="text-[10px] text-muted-foreground font-mono tracking-[0.2em] uppercase">Student OS v2.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.name}
                      className={cn(
                        "transition-all duration-300 relative overflow-hidden group/menu",
                        isActive
                          ? "bg-primary/10 text-cyan-400 font-semibold shadow-[inset_4px_0_0_0_#06b6d4,0_0_20px_rgba(6,182,212,0.15)]"
                          : "text-muted-foreground hover:text-cyan-300 hover:bg-white/5"
                      )}
                    >
                      <Link href={item.href} className="flex items-center w-full">
                        <div className={cn("absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 transition-opacity", isActive && "opacity-100")} />
                        <item.icon className={cn("size-4 mr-2 transition-transform group-hover/menu:scale-110", isActive && "text-cyan-400")} />
                        <span className={cn("relative z-10", isActive && "tracking-wide")}>{item.name}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]"
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex aspect-square size-6 items-center justify-center rounded-full">
                    <Users className="size-3 text-purple-400" />
                  </div>
                  <span>Workspace</span>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-dropdown-menu-trigger-width] bg-background/95 backdrop-blur-xl border-white/10">
                <DropdownMenuItem>Personal</DropdownMenuItem>
                <DropdownMenuItem>Team Alpha</DropdownMenuItem>
                <DropdownMenuItem>Enterprise</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function AppHeader() {
  const pathname = usePathname();
  const pageName = mainNav.find(n => n.href === pathname)?.name || "Dashboard";

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-white/5 px-6 backdrop-blur-2xl bg-black/20 supports-[backdrop-filter]:bg-black/10 transition-all">
      <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-cyan-400 transition-colors" />
      <Separator orientation="vertical" className="mr-2 h-4 bg-white/10" />
      <div className="flex flex-1 items-center gap-4">
        <div className="h-6 w-px bg-white/10 rotate-12" />
        <h1 className="text-sm font-bold tracking-widest text-cyan-400/80 uppercase font-mono">{pageName} // SYSTEM.ACTIVE</h1>
      </div>
      <div className="flex items-center gap-2">
        <SyncStatusIndicator />
        <Separator orientation="vertical" className="h-4 bg-white/10" />
        <ThemeToggle />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isFocusMode, toggleFocusMode } = useFocusStore();

  return (
    <SidebarProvider>
      {!isFocusMode && <AppSidebar />}

      <SidebarInset>
        {!isFocusMode && <AppHeader />}

        <motion.main
          layout
          className={cn(
            "flex-1 overflow-auto transition-all duration-500 ease-in-out",
            isFocusMode ? "container mx-auto max-w-4xl py-12 px-4" : ""
          )}
        >
          {children}
        </motion.main>
      </SidebarInset>

      <AnimatePresence>
        {isFocusMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              variant="outline"
              size="sm"
              className="shadow-lg border-white/10 bg-background/80 backdrop-blur-xl hover:bg-white/5"
              onClick={toggleFocusMode}
            >
              <LayoutIcon className="mr-2 h-4 w-4" />
              Exit Focus
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickCapture />
      <CommandMenu />
    </SidebarProvider>
  );
}
