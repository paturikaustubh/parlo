import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/landing/header";
import {
  IconBell,
  IconCar,
  IconBuildingStore,
  IconQrcode,
  IconLogin,
  IconLogout,
  IconUserPlus,
  IconDeviceMobile,
  IconStack2,
  IconArrowRight,
  IconCheck,
} from "@tabler/icons-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="dark bg-background text-foreground relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(var(--border) 1px, transparent 1px),
              linear-gradient(90deg, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />
        {/* Radial fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 20%, var(--background) 85%)",
          }}
        />
        {/* Amber glow */}
        <div
          className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.795 0.184 86.047 / 0.07) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Live badge */}
          <div
            className="flex justify-center mb-12"
            style={{ animation: "fade-in 0.6s ease both" }}
          >
            <Badge
              variant="outline"
              className="gap-2 px-3 py-1.5 text-xs border-primary/30 text-primary bg-primary/8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
              Real-time parking management
            </Badge>
          </div>

          {/* Headline */}
          <h1
            className="font-heading font-bold text-5xl md:text-[4.5rem] lg:text-[5.5rem] leading-[1.02] tracking-tight mb-6"
            style={{ animation: "fade-in 0.7s ease 0.1s both" }}
          >
            Parking that works
            <br />
            <span className="text-primary">at the speed of now.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-16 leading-relaxed"
            style={{ animation: "fade-in 0.7s ease 0.2s both" }}
          >
            Real-time checkout requests, multi-vehicle accounts, and seamless
            guest access — all in one platform built for modern parking lots.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 mb-16"
            style={{ animation: "fade-in 0.7s ease 0.3s both" }}
          >
            <Button size="lg" asChild>
              <Link href="/signup">
                <IconUserPlus size={18} />
                Get started free
                <IconArrowRight size={16} className="ml-1 opacity-70" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/signin">
                <IconLogin size={18} />
                Sign in
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link href="/g/checkin">
                <IconQrcode size={18} />
                Quick check-in
              </Link>
            </Button>
          </div>

          {/* Stats strip */}
          <div
            className="flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-border/40 pt-10"
            style={{ animation: "fade-in 0.7s ease 0.5s both" }}
          >
            {[
              { value: "< 30s", label: "Average checkout time" },
              { value: "All vehicle types", label: "2, 3 & 4-wheelers" },
              { value: "Zero app install", label: "Works in any browser" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-heading font-bold text-2xl text-primary leading-none mb-1">
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section id="features" className="bg-background py-24 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4 text-xs">
              Features
            </Badge>
            <h2 className="font-heading font-bold text-4xl md:text-5xl tracking-tight mb-5">
              Everything for a smooth
              <br />
              parking operation
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              Parlo handles the complexity — from real-time notifications to
              full business management.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <IconBell size={22} />,
                title: "Real-time checkout",
                description:
                  "Customers tap 'check out' on their phone. Your staff get notified instantly. No queuing, no manual tickets, no confusion.",
                highlight: true,
                badge: "Most loved",
              },
              {
                icon: <IconCar size={22} />,
                title: "Multi-vehicle support",
                description:
                  "Save cars, bikes, three-wheelers — all on one account. Pick the vehicle you drove today and check in in seconds.",
                highlight: false,
                badge: null,
              },
              {
                icon: <IconBuildingStore size={22} />,
                title: "Business dashboard",
                description:
                  "Manage spaces, staff shifts, and subscriptions from one place. Full session history, always live and in sync.",
                highlight: false,
                badge: null,
              },
            ].map((f) => (
              <Card
                key={f.title}
                className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <CardHeader className="pb-3 pt-6">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105">
                    {f.icon}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-bold text-lg leading-tight">
                      {f.title}
                    </h3>
                    {f.badge && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {f.badge}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section id="how-it-works" className="bg-muted/40 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4 text-xs">
              How it works
            </Badge>
            <h2 className="font-heading font-bold text-4xl md:text-5xl tracking-tight">
              Simple for everyone
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
            {/* Customers */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <IconDeviceMobile size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl leading-tight">
                    For customers
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Account or guest — your choice
                  </p>
                </div>
              </div>
              <div className="space-y-7">
                {[
                  {
                    n: "01",
                    title: "Scan or sign in",
                    desc: "Use the QR code at the entrance, or sign in to your account for a personalised experience.",
                  },
                  {
                    n: "02",
                    title: "Park your vehicle",
                    desc: "Drive in and park up. Your session is tracked from the moment you check in.",
                  },
                  {
                    n: "03",
                    title: "Request checkout",
                    desc: "When you're ready to leave, tap 'Request checkout' on your phone. That's it.",
                  },
                  {
                    n: "04",
                    title: "Drive away",
                    desc: "Staff are notified and clear you out. No ticket, no queue, no waiting.",
                  },
                ].map((step) => (
                  <div key={step.n} className="flex gap-4 group">
                    <div className="font-heading font-black text-2xl text-border group-hover:text-primary/30 transition-colors w-10 shrink-0 leading-none pt-0.5">
                      {step.n}
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">
                        {step.title}
                      </div>
                      <div className="text-muted-foreground text-sm leading-relaxed">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Businesses */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <IconStack2 size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl leading-tight">
                    For businesses
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set up in minutes, manage forever
                  </p>
                </div>
              </div>
              <div className="space-y-7">
                {[
                  {
                    n: "01",
                    title: "Register your business",
                    desc: "Sign up and submit your parking facility for verification. Quick, document-backed registration.",
                  },
                  {
                    n: "02",
                    title: "Add spaces & staff",
                    desc: "Configure parking spaces, set capacity, and invite your team with role-based access.",
                  },
                  {
                    n: "03",
                    title: "Go live",
                    desc: "Print your QR codes and place them at the entrance. Customers can check in immediately.",
                  },
                  {
                    n: "04",
                    title: "Manage in real-time",
                    desc: "See all active sessions, handle checkout requests as they come in, and review full history.",
                  },
                ].map((step) => (
                  <div key={step.n} className="flex gap-4 group">
                    <div className="font-heading font-black text-2xl text-border group-hover:text-primary/30 transition-colors w-10 shrink-0 leading-none pt-0.5">
                      {step.n}
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">
                        {step.title}
                      </div>
                      <div className="text-muted-foreground text-sm leading-relaxed">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GUEST BANNER ─────────────────────────────── */}
      <section
        id="guest"
        className="dark bg-background text-foreground py-20 px-6 relative overflow-hidden"
      >
        {/* Diagonal stripe bg */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              var(--foreground) 0,
              var(--foreground) 1px,
              transparent 0,
              transparent 50%
            )`,
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 50% 50%, transparent 40%, var(--background) 100%)",
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <IconQrcode size={28} className="text-primary" />
          </div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mb-4">
            Quick visit?
            <br />
            No account needed.
          </h2>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            Walk in, scan the QR code, and park. Request checkout from any
            browser — no sign-up, no app download, no friction.
          </p>

          {/* Checklist */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {[
              "Works on any phone",
              "No app install",
              "Instant checkout request",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <IconCheck size={14} className="text-primary shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/g/checkin">
                <IconQrcode size={18} />
                Guest check-in
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/g/checkout">
                <IconLogout size={18} />
                Check out
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="dark bg-background text-foreground border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-heading font-bold text-xs text-primary-foreground transition-transform group-hover:scale-105">
              P
            </div>
            <span className="font-heading font-bold text-base">parlo</span>
          </Link>
          <p className="text-xs text-muted-foreground order-last md:order-none">
            © 2026 Parlo. Built for Indian parking.
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/signin"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign up
            </Link>
            <Link
              href="/g/checkin"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Guest check-in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
