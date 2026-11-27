"use client";

import { createContext, useContext, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NavigationContext = createContext<{
  pending: boolean;
  navigate: (href: string, label: string) => void;
} | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");

  function navigate(href: string, destination: string) {
    setLabel(destination);
    startTransition(() => router.push(href));
  }

  return (
    <NavigationContext value={{ pending, navigate }}>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-50"
      >
        {pending && (
          <p className="bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
            Loading {label}…
          </p>
        )}
      </div>
      {children}
    </NavigationContext>
  );
}

export function useNavigationPending() {
  return useContext(NavigationContext)?.pending ?? false;
}

export function NavigationLink({
  href,
  label,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: string;
  label: string;
}) {
  const navigation = useContext(NavigationContext);
  return (
    <Link
      {...props}
      href={href}
      onNavigate={(event) => {
        if (!navigation) return;
        event.preventDefault();
        navigation.navigate(href, label);
      }}
    />
  );
}
