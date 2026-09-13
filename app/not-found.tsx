import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-4xl tracking-display">That page is not in this kitchen.</h1>
      <p className="measure text-lg leading-body text-muted-foreground">
        The recipe may have been renamed, or the link was written from memory.
      </p>
      <Link href="/" className="text-primary underline-offset-4 hover:underline">
        Back to the cookbook
      </Link>
    </div>
  );
}
