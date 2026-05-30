"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconRefresh,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  lastPage: number;
  pageSize: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  className?: string;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onRefresh: () => void;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function Pagination({
  page,
  lastPage,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  loading,
  className,
  onPageChange,
  onPageSizeChange,
  onRefresh,
}: PaginationProps) {
  const [inputVal, setInputVal] = useState(String(page));

  useEffect(() => {
    setInputVal(String(page));
  }, [page]);

  function commitInput() {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n >= 1 && n <= lastPage) {
      onPageChange(n);
    } else {
      setInputVal(String(page));
    }
  }

  const sortedOptions = [...new Set([...pageSizeOptions, pageSize])].sort(
    (a, b) => a - b,
  );

  if (lastPage <= 1 && sortedOptions.length <= 1) return null;

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1 || !!loading}
        onClick={() => onPageChange(1)}
      >
        <IconChevronsLeft size={14} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1 || !!loading}
        onClick={() => onPageChange(page - 1)}
      >
        <IconChevronLeft size={14} />
      </Button>

      <span className="flex items-center gap-1.5 text-sm text-muted-foreground px-1">
        Page
        <Input
          className="h-8 w-14 text-center text-sm px-1"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={commitInput}
          onKeyDown={(e) => e.key === "Enter" && commitInput()}
          disabled={!!loading}
        />
        of {lastPage}
      </span>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= lastPage || !!loading}
        onClick={() => onPageChange(page + 1)}
      >
        <IconChevronRight size={14} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= lastPage || !!loading}
        onClick={() => onPageChange(lastPage)}
      >
        <IconChevronsRight size={14} />
      </Button>

      <Select
        value={String(pageSize)}
        onValueChange={(v) => {
          onPageSizeChange(parseInt(v, 10));
        }}
      >
        <SelectTrigger className="h-8 w-[90px] text-xs">
          <SelectValue placeholder={String(pageSize)} />
        </SelectTrigger>
        <SelectContent>
          {sortedOptions.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onRefresh}
        disabled={!!loading}
      >
        <IconRefresh
          size={14}
          className={cn(
            loading && "animate-spin [animation-direction:reverse]",
          )}
        />
      </Button>
    </div>
  );
}
