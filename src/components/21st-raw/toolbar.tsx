"use client";

import * as React from "react"
import { cn } from "@/lib/utils";
import {
    Settings,
    Download,
    Share2,
    Sparkles,
    ChevronDown,
    Search,
    Filter,
} from "lucide-react";

interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
    onSearch?: (value: string) => void;
}

function Toolbar({
    className,
    onSearch,
    ...props
}: ToolbarProps) {
    return (
        <div
            className={cn(
                "w-full",
                "bg-white dark:bg-zinc-900",
                "border border-zinc-200 dark:border-zinc-800",
                "rounded-xl",
                "flex items-center gap-2 p-2",
                className
            )}
            {...props}
        >
            {/* Search Input */}
            <div className="flex-1 relative">
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full h-9 pl-9 pr-4
                        bg-zinc-100 dark:bg-zinc-800
                        text-sm text-zinc-900 dark:text-zinc-100
                        placeholder:text-zinc-500
                        rounded-lg focus:outline-none"
                    onChange={(e) => onSearch?.(e.target.value)}
                />
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Filter Button */}
            <button
                className="h-9 px-3
                    bg-zinc-100 dark:bg-zinc-800
                    rounded-lg flex items-center gap-2
                    text-sm text-zinc-900 dark:text-zinc-100
                    hover:bg-zinc-200 dark:hover:bg-zinc-700
                    transition-colors"
            >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                <ChevronDown className="w-4 h-4 text-zinc-500" />
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
                <button
                    className="h-9 w-9 flex items-center justify-center
                        rounded-lg
                        hover:bg-zinc-100 dark:hover:bg-zinc-800
                        transition-colors"
                >
                    <Settings className="w-4 h-4 text-zinc-500" />
                </button>
                <button
                    className="h-9 w-9 flex items-center justify-center
                        rounded-lg
                        hover:bg-zinc-100 dark:hover:bg-zinc-800
                        transition-colors"
                >
                    <Download className="w-4 h-4 text-zinc-500" />
                </button>
                <button
                    className="h-9 w-9 flex items-center justify-center
                        rounded-lg
                        hover:bg-zinc-100 dark:hover:bg-zinc-800
                        transition-colors"
                >
                    <Share2 className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            {/* Primary Action */}
            <button
                className="h-9 px-4 flex items-center gap-2
                    rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700
                    transition-colors"
            >
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm text-white">Create</span>
            </button>
        </div>
    );
}

export { Toolbar }
