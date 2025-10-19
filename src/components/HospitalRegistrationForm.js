"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

// --- MISTAKE ---
// This component was previously designed as a standalone page. This created a disconnected
// user experience because it could not easily communicate its state changes back to the main
// application router to trigger a UI update.

// --- FIX ---
// The component is now simplified to be a "dumb" form. It is designed to be embedded within
// the main `RegistrationForm.js`. Its core logic (the `handleSubmit` function) remains the same,
// including the crucial call to `refetchUserProfile()`. Because it now runs within the context
// of the main registration component, this state refetch will correctly trigger the parent
// to re-render and display the `HospitalRequestPending` page, creating a seamless flow.
export default function HospitalRegistrationForm() {
    const { contract, refetchUserProfile } = useWeb3();
    const [hospitalName, setHospitalName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!contract) {
            toast.error("Please connect your wallet first.");
            return;
        }
        if (!hospitalName) {
            toast.error("Please enter a hospital name.");
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("Submitting hospital registration request...");

        try {
            const tx = await contract.requestRegistration(hospitalName);
            await tx.wait();
            
            toast.success("Request submitted successfully! A Super Admin will review it shortly.", { id: toastId, duration: 5000 });
            setHospitalName('');
            
            // This is the key to the automatic transition. It tells the Web3Context to
            // fetch the user's status again from the backend. The backend will now report
            // 'pending_hospital', and the parent component (`RegistrationForm.js`) will
            // detect this and show the correct pending page.
            await refetchUserProfile();

        } catch (error) {
            console.error("Hospital registration request failed:", error);
            const reason = error.reason || "An error occurred.";
            toast.error(`Request failed: ${reason}`, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // The outer container and title are now handled by the parent `RegistrationForm`.
        // This form now only contains the necessary input and submit button.
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="hospitalName" className="block text-sm font-medium text-slate-700 mb-1">
                    Hospital Name
                </label>
                <div className="relative">
                     <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    <input
                        id="hospitalName"
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        placeholder="e.g., City General Hospital"
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                        required
                    />
                </div>
            </div>
            <p className="text-xs text-center text-slate-500">
                Submit a request to add your hospital. Your current wallet address will be proposed as the Hospital Administrator.
            </p>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-lg"
            >
                {isLoading ? 'Submitting...' : 'Request Hospital Registration'}
            </button>
        </form>
    );
}

