import Link from "next/link";
import { Home } from "lucide-react";

import GoBackButton from "@/components/helpers/GoBackButton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-4 flex h-screen flex-col items-center justify-center">
      <Card className="flex flex-col p-4 md:flex-row">
        <CardHeader className="p-4">
          <CardTitle>
            <p className="text-center text-7xl font-bold">404</p>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-between gap-y-4 p-4">
          <p className="text-center">
            The page you are looking for does not exist.
          </p>
          <div className="flex w-full space-x-2 ">
            <div className="w-1/2">
              <Link
                href="/"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full ",
                )}
              >
                <Home className="mr-2 h-6 w-6" />
                Go to home page
              </Link>
            </div>
            <div className="w-1/2">
              <GoBackButton className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
