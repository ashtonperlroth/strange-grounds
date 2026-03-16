import { cn } from "@/lib/utils";

interface LogoCloudProps {
  items: string[];
  className?: string;
  separator?: string;
}

export function LogoCloud({
  items,
  className,
  separator = "·",
}: LogoCloudProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-8",
        className
      )}
    >
      {items.map((item, index) => (
        <span key={item} className="flex items-center gap-6">
          <span className="font-mono text-sm tracking-wide text-muted-foreground">
            {item}
          </span>
          {index < items.length - 1 && (
            <span className="text-muted-foreground/40">{separator}</span>
          )}
        </span>
      ))}
    </div>
  );
}
