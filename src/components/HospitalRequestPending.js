"use client";

import { useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';

// --- ICONS ---
const ClockIcon = () => (
    <svg className="mx-auto h-16 w-16 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>;


export default function HospitalRequestPending() {
    // --- FIX APPLIED ---
    // Import the user's status and the refetch function from the Web3Context.
    const { userStatus, refetchUserProfile } = useWeb3();

    useEffect(() => {
        // This effect sets up a polling mechanism to automatically check for status updates.
        
        // Start an interval that runs every 5 seconds (5000 milliseconds).
        const intervalId = setInterval(() => {
            // If the component is still mounted and the user's status is still pending...
            if (userStatus === 'pending_hospital') {
                console.log("Polling for hospital verification status...");
                // ...trigger a refetch of the user's profile and status from the backend.
                refetchUserProfile();
            }
        }, 5000); 

        // Cleanup function: This will run when the component is unmounted 
        // (e.g., when the status changes and the app switches to the dashboard).
        // It's crucial to clear the interval to prevent memory leaks.
        return () => clearInterval(intervalId);

    // The effect depends on userStatus and refetchUserProfile. It will re-evaluate if they change.
    }, [userStatus, refetchUserProfile]);

    return (
        <div className="w-full max-w-lg mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 text-center">
            <ClockIcon />
            <h2 className="mt-6 text-2xl font-bold text-slate-900">Request Submitted for Review</h2>
            <p className="mt-3 text-md text-slate-600">
                Your request to register a new hospital is now pending approval from a Super Admin. 
                This page will automatically update once your request has been verified.
            </p>
            <div className="mt-8 flex justify-center items-center gap-3 text-sm text-slate-500">
                <Spinner />
                <span>Checking for updates...</span>
            </div>
        </div>
    );
}
