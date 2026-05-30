export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background overflow-hidden">
      {/* Parking grid lines — matches landing hero */}
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
      {/* Radial fade to soften edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, var(--background) 90%)",
        }}
      />
      {/* Amber glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.795 0.184 86.047 / 0.06) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
