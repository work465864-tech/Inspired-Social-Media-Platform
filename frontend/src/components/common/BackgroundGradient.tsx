export function BackgroundGradient() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl sm:h-[36rem] sm:w-[36rem]" />
      <div className="absolute -bottom-48 -right-36 h-[30rem] w-[30rem] rounded-full bg-secondary/15 blur-3xl sm:h-[40rem] sm:w-[40rem]" />
      <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl sm:h-[30rem] sm:w-[30rem]" />
    </div>
  );
}
