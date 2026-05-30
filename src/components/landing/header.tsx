"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconLogin, IconUserPlus, IconMenu2, IconX } from "@tabler/icons-react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "dark",
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-heading font-bold text-sm text-primary-foreground transition-transform group-hover:scale-105">
            P
          </div>
          <span className="font-heading font-bold text-lg text-foreground tracking-tight">
            parlo
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How it works
          </a>
          <a
            href="#guest"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Guest access
          </a>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/signin">
              <IconLogin size={16} />
              Sign in
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">
              <IconUserPlus size={16} />
              Sign up
            </Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-foreground p-1"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="dark md:hidden bg-background border-t border-border px-6 py-4 flex flex-col gap-4">
          <a
            href="#features"
            className="text-sm text-muted-foreground"
            onClick={() => setMenuOpen(false)}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground"
            onClick={() => setMenuOpen(false)}
          >
            How it works
          </a>
          <a
            href="#guest"
            className="text-sm text-muted-foreground"
            onClick={() => setMenuOpen(false)}
          >
            Guest access
          </a>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button size="sm" className="flex-1" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
