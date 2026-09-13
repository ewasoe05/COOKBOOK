import { Suspense } from "react";
import { HomeGate } from "@/components/home-gate";
import { HomeSkeleton } from "@/components/skeletons";

export default function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeGate />
    </Suspense>
  );
}
