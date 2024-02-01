import React from "react";
import { Menu } from "lucide-react";

import { ModeToggle } from "@/components/theme/ModeToggle";
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

import LinkItem from "./LinkItem";

const MobileNav = async () => {
  return (
    <Sheet>
      <div className="flex p-1">
        <SheetTrigger>
          <div className={` rounded-md border p-2`}>
            <Menu className="h-4 w-4 text-black dark:text-white" />
          </div>
        </SheetTrigger>
      </div>
      <SheetContent side={"left"} className="items-start">
        <SheetHeader>
          <SheetTitle className="font-display mt-4 flex items-center justify-between space-x-2 text-xl">
            <p>walnut.tv</p>
            <ModeToggle />
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full pr-4">
          <div className="flex h-full flex-col justify-between">
            <SheetDescription className="my-4 space-y-2">
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

            <SheetFooter className="my-8">
              {/* <Button variant="outline">Close</Button> */}
            </SheetFooter>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
