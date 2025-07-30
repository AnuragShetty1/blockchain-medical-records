"use client";

export default function DashboardSkeleton() {
    return (
        <div className="w-full max-w-2xl animate-pulse">
            {/* Main Profile Card Skeleton */}
            <div className="p-8 bg-white rounded-lg shadow-md">
                <div className="h-8 bg-gray-200 rounded-md w-3/4 mx-auto mb-6"></div>
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="flex justify-between">
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    </div>
                    <div className="pt-4">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                </div>
            </div>

            {/* Lower Section Skeleton */}
            <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-12 bg-gray-200 rounded-md"></div>
                    <div className="h-12 bg-gray-200 rounded-md"></div>
                </div>
            </div>
        </div>
    );
}
