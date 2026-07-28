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
import { channelLabel, channels } from "@/lib/data";
import { isActiveChannel } from "@/lib/utils";

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

            {channels.map((channel) => (
              <NavigationMenuItem key={channel.title}>
                <Link href={`/${channel.title}`} legacyBehavior passHref>
                  <NavigationMenuLink
                    active={isActiveChannel(path, channel.title)}
                    className={navigationMenuTriggerStyle()}
                  >
                    {channelLabel(channel)}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        {/*<ModeToggle className="ml-2 justify-self-end" />*/}
      </div>
    </div>
  );
};

export default Navbar;
