"use client";

export default function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      {/* Badge skeleton */}
      <div className="mb-6">
        <div className="w-32 h-10 bg-gray-200 rounded-full"></div>
      </div>
      {/* Analysis skeleton */}
      <div className="mb-6">
        <div className="w-36 h-7 bg-gray-200 rounded mb-3"></div>
        <div className="space-y-2">
          <div className="w-full h-4 bg-gray-200 rounded"></div>
          <div className="w-full h-4 bg-gray-200 rounded"></div>
          <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>{" "}
      {/* Sources skeleton */}
      <div>
        <div className="w-28 h-7 bg-gray-200 rounded mb-3"></div>
        <div className="space-y-2">
          <div className="flex items-start">
            <div className="w-4 h-4 bg-gray-200 rounded-full mt-1 mr-2 flex-shrink-0"></div>
            <div className="w-4/5 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-start">
            <div className="w-4 h-4 bg-gray-200 rounded-full mt-1 mr-2 flex-shrink-0"></div>
            <div className="w-3/5 h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
