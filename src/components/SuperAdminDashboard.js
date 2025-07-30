"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast'; // Import the toast functions

export default function SuperAdminDashboard() {
    const { contract } = useWeb3();
    const [adminAddress, setAdminAddress] = useState('');
    const [adminName, setAdminName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // We no longer need the 'message' state

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!adminAddress || !adminName || !contract) {
            toast.error("Please fill out all fields.");
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("Submitting transaction to add new Hospital Admin...");

        try {
            const tx = await contract.addHospitalAdmin(adminAddress, adminName);
            await tx.wait();

            // On success, update the loading toast to a success message
            toast.success(`Successfully added ${adminName} as a new Hospital Admin.`, { id: toastId });

            setAdminAddress('');
            setAdminName('');
        } catch (error) {
            console.error("Failed to add admin:", error);
            // On error, update the loading toast to an error message
            toast.error("Failed to add admin. The address may already be registered.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-md border-2 border-yellow-400">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Super Admin Dashboard</h2>
            <p className="text-center text-sm text-gray-500 mb-6">You are the contract owner.</p>
            <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        New Hospital Admin Address
                    </label>
                    <input
                        id="address"
                        type="text"
                        value={adminAddress}
                        onChange={(e) => setAdminAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        New Hospital Admin Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="e.g., Apollo Admin"
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 font-bold text-white bg-yellow-500 rounded-md hover:bg-yellow-600 disabled:bg-gray-400"
                >
                    {isLoading ? 'Processing...' : 'Add Hospital Admin'}
                </button>
            </form>
            {/* The old text message paragraph has been removed */}
        </div>
    );
}
