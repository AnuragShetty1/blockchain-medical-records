"use client";
import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

export default function RequestManager() {
    const { contract, account, requests, fetchPendingRequests } = useWeb3();
    // New state to hold the duration for each request
    const [durations, setDurations] = useState({});

    const handleDurationChange = (requestId, value) => {
        setDurations(prev => ({ ...prev, [requestId]: value }));
    };

    const handleApprove = async (requestId) => {
        if (!contract || !account) return;
        const duration = durations[requestId] || 30; // Default to 30 days if not set

        const toastId = toast.loading(`Approving request for ${duration} days...`);
        try {
            const tx = await contract.approveRequest(requestId, duration);
            await tx.wait();
            toast.success('Request approved!', { id: toastId });
            fetchPendingRequests(account, contract); 
        } catch (error) {
            console.error("Failed to approve request:", error);
            toast.error('Failed to approve request.', { id: toastId });
        }
    };

    if (requests.length === 0) return null;

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Pending Access Requests</h3>
            <div className="space-y-4">
                {requests.map((req) => (
                    <div key={Number(req.id)} className="p-4 bg-white rounded-md shadow-sm">
                        <p><strong>Provider:</strong> <span className="font-mono text-sm">{req.provider}</span></p>
                        <p><strong>Claim ID:</strong> {req.claimId}</p>
                        <div className="mt-3 flex items-center gap-4">
                            <input
                                type="number"
                                min="1"
                                placeholder="Days (e.g., 30)"
                                onChange={(e) => handleDurationChange(Number(req.id), e.target.value)}
                                className="w-32 px-3 py-1 border border-gray-300 rounded-md"
                            />
                            <button onClick={() => handleApprove(Number(req.id))} className="px-4 py-1 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600">
                                Approve
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
