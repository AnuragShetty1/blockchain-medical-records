"use client";

export default function HospitalRequestPending() {
    return (
        <div className="w-full max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md text-center">
            <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Registration Submitted</h2>
            <p className="mt-2 text-md text-slate-600">
                Your request to register a new hospital has been received. It is currently under review by the Super Admin.
            </p>
            <p className="mt-4 text-sm text-slate-500">
                You will be able to access the admin dashboard once your request has been approved. Please check back later.
            </p>
        </div>
    );
}
