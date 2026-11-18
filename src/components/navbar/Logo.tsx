import Image from "next/image";
import Link from "next/link";

import { NavigationLink } from "@/components/providers/NavigationProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Logo = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <NavigationLink
            href="/"
            label="home"
            className="mr-5 flex h-[50px] shrink-0 max-[992px]:self-start"
          >
            <Image src="/img/walnut-logo.svg" alt="Walnut.tv" width={15} height={50} />
          </NavigationLink>
        </TooltipTrigger>
        <TooltipContent>
          <Link href="mailto:hi@walnut.tv" className="text-primary underline">
            hi@walnut.tv
          </Link>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Logo;
