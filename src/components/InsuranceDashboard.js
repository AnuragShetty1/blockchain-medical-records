"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

export default function InsuranceDashboard() {
    const { contract } = useWeb3();
    const [patientAddress, setPatientAddress] = useState('');
    const [claimId, setClaimId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRequest = async (e) => {
        e.preventDefault();
        if (!patientAddress || !claimId || !contract) {
            toast.error("Please fill out all fields.");
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("Submitting access request...");

        try {
            const tx = await contract.requestAccess(patientAddress, claimId);
            await tx.wait();
            toast.success(`Successfully requested access for claim: ${claimId}`, { id: toastId });
            setPatientAddress('');
            setClaimId('');
        } catch (error) {
            console.error("Request failed:", error);
            toast.error("Request failed. Please check the console for details.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Insurance Dashboard</h2>
            <form onSubmit={handleRequest} className="space-y-4">
                <div>
                    <label htmlFor="patientAddress" className="block text-sm font-medium text-gray-700">
                        Patient&apos;s Wallet Address
                    </label>
                    <input
                        id="patientAddress"
                        type="text"
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="claimId" className="block text-sm font-medium text-gray-700">
                        Claim ID
                    </label>
                    <input
                        id="claimId"
                        type="text"
                        value={claimId}
                        onChange={(e) => setClaimId(e.target.value)}
                        placeholder="e.g., claim-12345"
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                        required
                    />
                </div>
                <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
                    {isLoading ? 'Processing...' : 'Request Access'}
                </button>
            </form>
        </div>
    );
}
