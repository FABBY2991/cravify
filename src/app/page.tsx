import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Storefront } from "@/components/site/Storefront";

export default function Home() {
  return (
    <ErrorBoundary title="The menu didn't load">
      <Storefront />
    </ErrorBoundary>
  );
}
