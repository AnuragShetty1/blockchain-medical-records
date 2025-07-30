"use client";

import { useWeb3 } from '@/context/Web3Context';

export default function RequestManager() {
    // Get requests and the fetch function directly from the context
    const { contract, account, requests, fetchPendingRequests } = useWeb3();

    const handleApprove = async (requestId) => {
        if (!contract || !account) return;
        try {
            const tx = await contract.approveRequest(requestId);
            await tx.wait();
            // Refresh list after approval by calling the context's fetch function
            fetchPendingRequests(account, contract); 
        } catch (error) {
            console.error("Failed to approve request:", error);
        }
    };

    // The component no longer needs its own useEffect or loading state
    if (requests.length === 0) return null;

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Pending Access Requests</h3>
            <div className="space-y-4">
                {requests.map((req) => (
                    <div key={Number(req.id)} className="p-4 bg-white rounded-md shadow-sm">
                        <p><strong>Provider:</strong> <span className="font-mono text-sm">{req.provider}</span></p>
                        <p><strong>Claim ID:</strong> {req.claimId}</p>
                        <button onClick={() => handleApprove(req.id)} className="mt-2 px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600">
                            Approve
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
