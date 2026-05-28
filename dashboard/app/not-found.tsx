export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-8">
      <div className="panel max-w-xl p-8 text-center">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">REALM LOST</div>
        <h1 className="mt-3 font-display text-3xl text-text-primary">This path is not part of the realm.</h1>
        <p className="mt-4 text-sm text-text-secondary">
          Return to the bridge and choose another road.
        </p>
      </div>
    </div>
  );
}
