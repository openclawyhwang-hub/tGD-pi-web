import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <Suspense>
        <AppShell />
      </Suspense>
    </ErrorBoundary>
  );
}
