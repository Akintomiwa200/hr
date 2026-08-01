export function DashboardPage({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-6xl mx-auto w-full ${className}`.trim()}>{children}</div>
  );
}
