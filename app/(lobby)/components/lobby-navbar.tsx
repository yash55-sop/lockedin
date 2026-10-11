import Link from "next/link";

import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function LobbyNavbar() {
  return (
    <header className="h-16 border-b">
      <nav
        aria-label="Application"
        className="container flex h-full items-center justify-between"
      >
        <Link
          href="/templates"
          className="flex items-center gap-2 font-semibold"
        >
          <Logo size={24} />
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/templates"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Open workspace
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
