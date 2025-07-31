"use client";

/**
 * A professional, user-friendly component to inform users that their account is awaiting verification.
 * This is shown to roles like Doctors who cannot access their full dashboard until approved by an admin.
 */
export default function PendingVerification() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-128px)] w-full">
            <div className="w-full max-w-2xl p-8 text-center bg-white rounded-2xl shadow-xl border border-slate-200">
                <div className="flex items-center justify-center mb-6">
                    <div className="bg-amber-100 p-4 rounded-full">
                        <svg className="w-12 h-12 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
                    Verification Pending
                </h1>
                <p className="text-lg text-slate-600 mb-2">
                    Thank you for registering as a Doctor.
                </p>
                <p className="text-slate-500 max-w-md mx-auto">
                    Your account has been created but requires verification from a registered Hospital Administrator before you can access the Doctor's Portal. This is a security measure to ensure the integrity of our network.
                </p>
                <div className="mt-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-700">No further action is needed from you at this time. You will be able to log in and access your portal once your identity has been confirmed.</p>
                </div>
            </div>
        </div>
    );
}
