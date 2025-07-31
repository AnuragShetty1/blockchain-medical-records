"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

/**
 * SuperAdminDashboard component for the contract owner to add new Hospital Admins.
 * This component features a professional, card-based UI consistent with the application's design language.
 */
export default function SuperAdminDashboard() {
    // Web3 context for contract interaction
    const { contract } = useWeb3();

    // State for form inputs and loading status
    const [adminAddress, setAdminAddress] = useState('');
    const [adminName, setAdminName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Handles the form submission to add a new Hospital Admin.
     * It performs validation, interacts with the smart contract, and provides user feedback via toasts.
     * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
     */
    const handleAddAdmin = async (e) => {
        e.preventDefault();
        // Basic validation
        if (!adminAddress || !adminName || !contract) {
            toast.error("Please fill out all fields and ensure your wallet is connected.");
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("Submitting transaction to add new Hospital Admin...");

        try {
            // Contract interaction
            const tx = await contract.addHospitalAdmin(adminAddress, adminName);
            await tx.wait(); // Wait for the transaction to be mined

            // Success feedback
            toast.success(`Successfully added ${adminName} as a new Hospital Admin.`, { id: toastId });

            // Reset form fields
            setAdminAddress('');
            setAdminName('');
        } catch (error) {
            console.error("Failed to add admin:", error);
            // Error feedback
            toast.error("Failed to add admin. The address may already be registered.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-2xl shadow-lg border border-slate-200">
            {/* Header Section */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h2>
                <p className="mt-2 text-slate-500">You have contract owner privileges.</p>
            </div>

            {/* Form Section */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <form onSubmit={handleAddAdmin} className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 text-center">Create New Hospital Admin</h3>
                    
                    {/* Admin Address Input */}
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
                            Admin's Wallet Address
                        </label>
                        <div className="relative">
                            <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm-2.25-2.25v-1.5a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25v1.5m-19.5-6.375a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25v1.5" />
                            </svg>
                            <input
                                id="address"
                                type="text"
                                value={adminAddress}
                                onChange={(e) => setAdminAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 transition"
                                required
                            />
                        </div>
                    </div>

                    {/* Admin Name Input */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                            Admin's Name
                        </label>
                        <div className="relative">
                             <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <input
                                id="name"
                                type="text"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                                placeholder="e.g., Apollo Hospital Admin"
                                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 transition"
                                required
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-4 py-3 font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:bg-slate-400 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                    >
                        {isLoading ? 'Processing...' : 'Add Hospital Admin'}
                    </button>
                </form>
            </div>
        </div>
    );
}
