"use client";

import React from "react";
import { usePathname } from "next/navigation";

const Route = () => {
  const pathname = usePathname();
  return (
    <p className="text-xs font-normal">
      {pathname.split("/")[1]?.toUpperCase()}
    </p>
  );
};

export default Route;
