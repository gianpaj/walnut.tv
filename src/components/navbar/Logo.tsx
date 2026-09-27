import Image from "next/image";
import Link from "next/link";

import { NavigationLink } from "@/components/providers/NavigationProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  className?: string;
};

const Logo = (props: Props) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <NavigationLink href="/" label="home">
            <Image src="/img/walnut-logo.svg" alt="Walnut.tv" width={32} height={48} {...props} />
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
