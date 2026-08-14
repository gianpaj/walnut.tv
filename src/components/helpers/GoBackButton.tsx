"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

const GoBackButton = (props: Props) => {
  const router = useRouter();
  return (
    <Button
      className={cn(props.className)}
      onClick={() => router.back()}
      variant={"default"}
    >
      <ArrowLeftIcon className="mr-2 h-4 w-4" />
      Go Back
    </Button>
  );
};

export default GoBackButton;
