import React from "react";
import { Menu } from "lucide-react";

// import { ModeToggle } from "@/components/theme/ModeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Button } from "../ui/button";
import LinkItem from "./LinkItem";

const MobileNav = async () => {
  return (
    <Sheet>
      <SheetTrigger className="flex p-1">
        <div className={` rounded-md border p-2`}>
          <Menu className="h-4 w-4 text-black dark:text-white" />
        </div>
      </SheetTrigger>
      <SheetContent side={"left"} className="items-start">
        <SheetHeader>
          <SheetTitle className="font-display mt-4 flex items-center justify-between space-x-2 text-xl">
            <p>walnut.tv</p>
            {/*<ModeToggle />*/}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea>
          <div className="flex justify-center">
            <SheetDescription className="my-4 grid h-[calc(100svh-46px-32px)] w-1/2 grid-flow-row grid-cols-1">
              <LinkItem href="/reddit" className="w-full">
                Reddit
              </LinkItem>
              <LinkItem href="/hustle" className="w-full">
                Hustle
              </LinkItem>
              <LinkItem href="/ai" className="w-full">
                AI
              </LinkItem>
              <LinkItem href="/crypto" className="w-full">
                Crypto
              </LinkItem>
              <LinkItem href="/curious" className="w-full">
                Curious
              </LinkItem>
              <LinkItem href="/docus" className="w-full">
                Docus
              </LinkItem>
            </SheetDescription>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
