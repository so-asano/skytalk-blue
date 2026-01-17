import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-1 text-sm text-muted-foreground flex-nowrap overflow-hidden", className)}>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1 shrink-0">
          {index > 0 && <ChevronRight className="w-4 h-4 shrink-0" />}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors truncate"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground truncate">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
