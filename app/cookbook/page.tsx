import { Suspense } from "react";
import { CookbookHome } from "@/components/cookbook-home";
import { HomeSkeleton } from "@/components/skeletons";

export const metadata = { title: "Cookbook" };

export default function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <CookbookHome />
    </Suspense>
  );
}
