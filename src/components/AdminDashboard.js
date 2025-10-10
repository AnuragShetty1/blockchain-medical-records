"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

export default function AdminDashboard() {
    const { contract } = useWeb3();
    const [searchAddress, setSearchAddress] = useState('');
    const [searchedUser, setSearchedUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // MODIFIED: Added LabTechnician to the array
    const roleNames = ["Patient", "Doctor", "Hospital Admin", "Insurance Provider", "Pharmacist", "Researcher", "Guardian", "LabTechnician"];

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!ethers.isAddress(searchAddress)) {
            toast.error("Please enter a valid Ethereum address.");
            return;
        }
        setIsLoading(true);
        setSearchedUser(null);
        try {
            const user = await contract.users(searchAddress);
            if (user.walletAddress === ethers.ZeroAddress) {
                toast.error("No user found with this address.");
            } else {
                setSearchedUser(user);
            }
        } catch (error) {
            console.error("Search failed:", error);
            toast.error("Failed to fetch user data.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!searchedUser) return;
        setIsLoading(true);
        const toastId = toast.loading(`Verifying ${searchedUser.name}...`);
        try {
            const tx = await contract.verifyUser(searchedUser.walletAddress);
            await tx.wait();
            toast.success(`${searchedUser.name} has been verified!`, { id: toastId });
            // Refresh search to show updated status
            handleSearch({ preventDefault: () => {} });
        } catch (error) {
            console.error("Verification failed:", error);
            toast.error("Verification failed.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Determine if the searched user is a verifiable professional
    const isVerifiableProfessional = searchedUser && !searchedUser.isVerified && (
        Number(searchedUser.role) === 1 || // Doctor
        Number(searchedUser.role) === 7   // LabTechnician
    );
    const roleName = searchedUser ? roleNames[Number(searchedUser.role)] : '';

    return (
        <div className="w-full max-w-4xl p-8 space-y-8 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Hospital Admin Dashboard</h2>
                <p className="mt-2 text-gray-500">Search for users to view their status and verify professionals.</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        placeholder="Enter user's wallet address (0x...)"
                        className="flex-grow px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                    <button type="submit" disabled={isLoading} className="px-6 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {searchedUser && (
                <div className="mt-8 p-6 border rounded-xl animate-fade-in">
                    <h3 className="text-xl font-bold mb-4">User Details</h3>
                    <div className="space-y-3">
                        <p><strong>Name:</strong> {searchedUser.name}</p>
                        <p><strong>Role:</strong> {roleName}</p>
                        <p><strong>Status:</strong> 
                            <span className={`ml-2 font-semibold ${searchedUser.isVerified ? 'text-green-600' : 'text-red-600'}`}>
                                {searchedUser.isVerified ? "Verified" : "Not Verified"}
                            </span>
                        </p>
                        <p className="font-mono text-sm"><strong>Address:</strong> {searchedUser.walletAddress}</p>

                        {/* MODIFIED: Dynamic verification button */}
                        {isVerifiableProfessional && (
                            <button onClick={handleVerify} disabled={isLoading} className="mt-4 w-full px-4 py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">
                                {isLoading ? 'Verifying...' : `Verify this ${roleName}`}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
