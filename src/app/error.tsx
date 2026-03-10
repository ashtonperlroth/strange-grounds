"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] px-4">
      <h1 className="text-2xl font-bold text-stone-800">
        Something went wrong
      </h1>
      <p className="mt-2 text-stone-500">An unexpected error occurred.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Try again
      </button>
    </div>
  );
}
