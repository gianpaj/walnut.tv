"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Logo from "@/components/navbar/Logo";
// import { ModeToggle } from "@/components/theme/ModeToggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const Navbar = () => {
  const path = usePathname();

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center justify-center bg-navbar-background">
        <NavigationMenu>
          <NavigationMenuList className="space-x-4 uppercase">
            <div className="mx-4">
              <Logo />
            </div>

            <NavigationMenuItem>
              <Link href="/reddit" legacyBehavior passHref>
                <NavigationMenuLink
                  active={path.includes("/reddit")}
                  className={navigationMenuTriggerStyle()}
                >
                  Reddit
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/hustle" legacyBehavior passHref>
                <NavigationMenuLink
                  active={path.includes("/hustle")}
                  className={navigationMenuTriggerStyle()}
                >
                  Hustle
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/ai" legacyBehavior passHref>
                <NavigationMenuLink
                  active={path.includes("/ai")}
                  className={navigationMenuTriggerStyle()}
                >
                  AI
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/crypto" legacyBehavior passHref>
                <NavigationMenuLink
                  active={path.includes("/crypto")}
                  className={navigationMenuTriggerStyle()}
                >
                  Crypto
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/curious" legacyBehavior passHref>
                <NavigationMenuLink
                  active={path.includes("/curious")}
                  className={navigationMenuTriggerStyle()}
                >
                  Curious
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/docus" legacyBehavior passHref>
                <NavigationMenuLink
                  active={path.includes("/docus")}
                  className={navigationMenuTriggerStyle()}
                >
                  Docus
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        {/*<ModeToggle className="ml-2 justify-self-end" />*/}
      </div>
    </div>
  );
};

export default Navbar;
