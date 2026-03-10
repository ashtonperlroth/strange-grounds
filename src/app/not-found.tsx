import Link from "next/link";
import { Mountain } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] px-4">
      <Mountain className="mb-4 size-12 text-emerald-600" />
      <h1 className="text-2xl font-bold text-stone-800">Trail not found</h1>
      <p className="mt-2 text-stone-500">
        This route doesn&apos;t exist. Maybe it&apos;s off the map.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Back to the map
      </Link>
    </div>
  );
}
