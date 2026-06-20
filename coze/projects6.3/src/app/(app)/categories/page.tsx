import { Suspense } from "react";
import CategoriesClient from "./categories-client";

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12 text-gray-500">
          加载中...
        </div>
      }
    >
      <CategoriesClient />
    </Suspense>
  );
}
