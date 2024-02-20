import React from "react";
import Image from "next/image";
import Link from "next/link";

import MobileNav from "./MobileNav";
import Navbar from "./Navbar";
import Route from "./Route";

const Header = () => {
  return (
    <div className="border-b p-4 md:border-b-0 md:p-0">
      <div className="hidden md:flex">
        <Navbar />
      </div>
      <div className="flex items-center md:hidden">
        <MobileNav />
        <Link href="/" className="ml-2">
          <div className="flex items-center space-x-1">
            <Image
              src="/img/icons/android-chrome-192x192.png"
              alt="Logo"
              width={35}
              height={35}
              className="mr-2 h-8 w-8 rounded-full object-contain md:mx-2 md:hidden"
            />
            <div className="flex flex-col text-xl font-bold text-primary md:text-3xl">
              <span>walnut.tv</span>
              <Route />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Header;
