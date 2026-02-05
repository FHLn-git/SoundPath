export default function VenueDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-800 rounded" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 bg-gray-800 rounded-lg" />
        <div className="h-32 bg-gray-800 rounded-lg" />
      </div>
      <div className="h-64 bg-gray-800 rounded-lg" />
    </div>
  )
}
