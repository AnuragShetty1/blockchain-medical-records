"use client";

import { useEffect } from "react";
import { useWeb3 } from "@/context/Web3Context";

/**
 * A professional, user-friendly component to inform users that their account is awaiting verification.
 * This version includes a polling mechanism to automatically refresh the user's status, providing a seamless
 * transition to the next step upon approval without requiring a manual page reload.
 */
export default function PendingVerification() {
    // --- MISTAKE ---
    // The previous version had two main issues:
    // 1. It used complex, incorrect logic to determine the role name, causing the "registering as ." bug.
    // 2. It was a static page, forcing the user to manually refresh to check if they had been approved.

    // --- FIX ---
    // 1. The `userProfile` object, which contains the user's role as a simple string (e.g., "Doctor"), is
    //    now correctly destructured from the `useWeb3` hook. The role is displayed directly.
    // 2. The `refetchUserProfile` function is also destructured. A `useEffect` hook is added to set up a
    //    polling interval that calls this function every 5 seconds. This keeps the user's status up-to-date.
    //    Once a hospital admin approves the user, the `userStatus` in the context will change, and the main
    //    `Dashboard.js` component will automatically route them to the next step (PublicKeySetup).
    const { userProfile, userStatus, refetchUserProfile } = useWeb3();

    useEffect(() => {
        // Set up a polling mechanism to check for status updates.
        const interval = setInterval(() => {
            // Only refetch if the status is still pending to avoid unnecessary calls.
            if (userStatus === 'pending') {
                refetchUserProfile();
            }
        }, 5000); // Check every 5 seconds

        // Clean up the interval when the component unmounts to prevent memory leaks.
        return () => clearInterval(interval);
    }, [userStatus, refetchUserProfile]);

    // Use a fallback for the role name in case the profile is momentarily unavailable.
    const roleName = userProfile?.role || "Professional";

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-128px)] w-full bg-slate-50 p-4">
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
                    Thank you for registering as a <span className="font-semibold text-slate-700">{roleName}</span>.
                </p>
                <p className="text-slate-500 max-w-md mx-auto">
                    Your account requires verification from your hospital's administrator. This is a security measure to ensure the integrity of our network.
                </p>
                <div className="mt-8 bg-slate-50 p-4 rounded-lg border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-2 bg-amber-400 animate-pulse"></div>
                    <p className="text-sm text-slate-700 font-medium">
                        No further action is needed from you. This page will update automatically once your account has been approved.
                    </p>
                </div>
            </div>
        </div>
    );
}
