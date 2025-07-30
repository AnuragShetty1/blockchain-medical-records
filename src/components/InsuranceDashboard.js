"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';

export default function InsuranceDashboard() {
    const { contract } = useWeb3();
    const [patientAddress, setPatientAddress] = useState('');
    const [claimId, setClaimId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleRequest = async (e) => {
        e.preventDefault();
        if (!patientAddress || !claimId || !contract) return;

        setIsLoading(true);
        setMessage("Submitting access request...");

        try {
            const tx = await contract.requestAccess(patientAddress, claimId);
            await tx.wait();
            setMessage(`Successfully requested access for claim: ${claimId}`);
            setPatientAddress('');
            setClaimId('');
        } catch (error) {
            console.error("Request failed:", error);
            setMessage("Request failed. Check console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Insurance Dashboard</h2>
            <form onSubmit={handleRequest} className="space-y-4">
                <input
                    type="text"
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                    placeholder="Patient's Wallet Address (0x...)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                />
                <input
                    type="text"
                    value={claimId}
                    onChange={(e) => setClaimId(e.target.value)}
                    placeholder="Claim ID (e.g., claim-12345)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                />
                <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
                    {isLoading ? 'Processing...' : 'Request Access'}
                </button>
            </form>
            {message && <p className="mt-4 text-sm text-center text-gray-600 break-words">{message}</p>}
        </div>
    );
}
