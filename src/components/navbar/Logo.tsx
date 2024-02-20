import Image from "next/image";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  className?: string;
};

const Logo = (props: Props) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Image
            src="/img/icons/android-chrome-192x192.png"
            alt="Walnut.tv"
            width={48}
            height={48}
            {...props}
          />
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
