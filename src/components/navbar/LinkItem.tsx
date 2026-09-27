"use client";

import { usePathname } from "next/navigation";

import { NavigationLink } from "@/components/providers/NavigationProvider";
import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import { SheetClose } from "../ui/sheet";

export default function LinkItem({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <SheetClose asChild>
      <Button
        asChild
        variant="secondary"
        size="lg"
        className={cn(
          "w-full",
          pathname === href || pathname.startsWith(`${href}/`) ? "bg-primary text-black" : "",
        )}
      >
        <NavigationLink
          href={href}
          label={typeof children === "string" ? children : "channel"}
          className={className}
        >
          {children}
        </NavigationLink>
      </Button>
    </SheetClose>
  );
}
