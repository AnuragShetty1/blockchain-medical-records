"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

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
            
            // --- FIX APPLIED ---
            // Immediately refetch the user's profile. This will update their status 
            // from 'unregistered' to 'pending_hospital', causing the UI to
            // automatically switch to the HospitalRequestPending component.
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
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-slate-200">
            <h2 className="text-2xl font-bold text-center text-slate-900">Register a New Hospital</h2>
            <p className="text-center text-sm text-slate-500">
                Submit a request to add your hospital to the network. Your current wallet address will be proposed as the Hospital Administrator.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="hospitalName" className="block text-sm font-medium text-slate-700 mb-1">
                        Hospital Name
                    </label>
                    <input
                        id="hospitalName"
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        placeholder="e.g., City General Hospital"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-lg"
                >
                    {isLoading ? 'Submitting...' : 'Request Registration'}
                </button>
            </form>
        </div>
    );
}
