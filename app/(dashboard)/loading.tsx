export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-gray-100" />
          <div className="h-4 w-72 rounded bg-gray-100" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-gray-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="mt-4 h-7 w-16 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-gray-100 bg-white" />
    </div>
  );
}
