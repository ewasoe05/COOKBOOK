export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-11 w-24 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="h-40 animate-pulse bg-muted" />
        <div className="flex flex-col gap-3 p-6">
          <div className="h-8 w-3/4 animate-pulse bg-muted" />
          <div className="h-4 w-full animate-pulse bg-muted" />
          <div className="h-4 w-2/3 animate-pulse bg-muted" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg border border-border">
            <div className="h-24 animate-pulse bg-muted" />
            <div className="flex flex-col gap-3 p-5">
              <div className="h-6 w-2/3 animate-pulse bg-muted" />
              <div className="h-4 w-full animate-pulse bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="h-10 w-48 animate-pulse bg-muted" />
      <div className="h-4 w-full max-w-xl animate-pulse bg-muted" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse bg-muted" />
      ))}
    </div>
  );
}

export function RecipeSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden>
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-6 w-full max-w-xl animate-pulse bg-muted" />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-6 animate-pulse bg-muted" />
          ))}
        </div>
        <div className="flex flex-col gap-6 lg:col-span-7">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
