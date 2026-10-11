import React from "react";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

export function SidebarMobile() {
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" aria-label="Open navigation">
        <Menu className="mr-2 size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navigation</SheetDescription>
        </SheetHeader>
        <div className="h-full bg-background">
          <Sidebar isCollapsed={false} className="block lg:block" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
