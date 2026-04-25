export default function Page() {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col gap-6 p-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Dashboard
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          Universal sidebar shell is active here too.
        </h1>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl border bg-muted/40" />
        <div className="aspect-video rounded-xl border bg-muted/40" />
        <div className="aspect-video rounded-xl border bg-muted/40" />
      </div>

      <div className="min-h-[24rem] flex-1 rounded-xl border bg-muted/40" />
    </div>
  );
}
