"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { NavigationLink } from "@/components/providers/NavigationProvider";
import { channelLabel, channels } from "@/lib/data";
import { cn, isActiveChannel } from "@/lib/utils";

import Logo from "./Logo";

/**
 * The legacy navbar: logo and plain category links. Phones in portrait get the
 * same links in a dropdown under a button naming the current category.
 */
const Header = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const current = channels.find((channel) => isActiveChannel(pathname, channel.title));

  const links = channels.map((channel) => (
    <li key={channel.title}>
      <NavigationLink
        href={`/${channel.title}`}
        label={channelLabel(channel)}
        onClick={() => setOpen(false)}
        className={cn(
          "block px-[14px] py-[15px] font-semibold uppercase leading-5 hover:text-white max-[992px]:px-1.5 max-[992px]:py-2.5 max-[992px]:text-xs/5",
          current === channel ? "text-white" : "text-negative",
        )}
      >
        {channel.title}
      </NavigationLink>
    </li>
  ));

  return (
    <header className="shrink-0 bg-navbar-background px-5 min-[993px]:px-[30px]">
      <div className="flex min-h-[50px] items-center justify-center">
        <Logo />
        <div
          className="flex w-[86px] flex-col items-center min-[993px]:hidden landscape:hidden"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !open) return;
            setOpen(false);
            toggleRef.current?.focus();
          }}
        >
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="category-menu"
            onClick={() => setOpen(!open)}
            className="my-2 rounded border border-[#333] px-2.5 py-[9px] uppercase text-white hover:bg-[#333] focus:bg-[#333]"
          >
            <span className="sr-only">Category </span>
            {current?.title ?? "channels"}
          </button>
          {open && (
            <ul
              id="category-menu"
              className="border-t border-[#101010] py-[7.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            >
              {links}
            </ul>
          )}
        </div>
        <ul className="flex items-center max-[992px]:portrait:hidden">{links}</ul>
      </div>
    </header>
  );
};

export default Header;
