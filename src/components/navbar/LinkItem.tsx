"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      <Link href={href} className={className}>
        <Button
          variant={"secondary"}
          size={"sm"}
          className={cn(
            "w-full",
            pathname === `/${children?.toString().toLowerCase()}`
              ? "bg-primary text-black"
              : "",
          )}
        >
          {children}
        </Button>
      </Link>
    </SheetClose>
  );
}
