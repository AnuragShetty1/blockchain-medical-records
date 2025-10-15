"use client";
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function SuperAdminDashboard() {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [verifiedHospitals, setVerifiedHospitals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [verifyingId, setVerifyingId] = useState(null); // Tracks the ID of the request being verified

    const API_URL = 'http://localhost:3001/api/super-admin';

    const fetchRequestsAndHospitals = useCallback(async () => {
        setIsLoading(true);
        try {
            const requestsResponse = await axios.get(`${API_URL}/requests`);
            const hospitalsResponse = await axios.get(`${API_URL}/hospitals`);
            setPendingRequests(requestsResponse.data.data || []);
            setVerifiedHospitals(hospitalsResponse.data.data || []);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.message || 'Failed to fetch data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequestsAndHospitals();
    }, [fetchRequestsAndHospitals]);

    // --- NEW, SIMPLIFIED & ROBUST VERIFICATION FLOW ---
    const handleVerify = async (requestId, adminAddress) => {
        setVerifyingId(requestId); // 1. Set loading state for this specific item
        setError('');

        try {
            // 2. Call the API, which now waits for blockchain confirmation
            const response = await axios.post(`${API_URL}/verify-hospital`, {
                requestId,
                adminAddress
            });

            if (response.data.success) {
                // 3. On success, we know the database is updated. Fetch the new source of truth.
                await fetchRequestsAndHospitals();
            } else {
                throw new Error(response.data.message || 'Verification failed.');
            }

        } catch (err) {
            console.error("Error verifying hospital:", err);
            setError(err.response?.data?.message || 'A critical error occurred during verification.');
        } finally {
            setVerifyingId(null); // 4. Clear the loading state
        }
    };

    if (isLoading && !verifyingId) {
        return <div className="text-center p-8">Loading dashboard...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 bg-slate-50 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Super Admin Dashboard</h1>
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending Requests Column */}
                <div>
                    <h2 className="text-2xl font-semibold text-slate-700 mb-4 border-b pb-2">Pending Hospital Requests</h2>
                    {pendingRequests.length > 0 ? (
                        <div className="space-y-4">
                            {pendingRequests.map((req) => (
                                <div key={req.requestId} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800">{req.hospitalName}</h3>
                                    <p className="text-sm text-slate-500 mt-1">Request ID: {req.requestId}</p>
                                    <p className="text-sm text-slate-500 break-words">Admin: {req.requesterAddress}</p>
                                    <button
                                        onClick={() => handleVerify(req.requestId, req.requesterAddress)}
                                        disabled={!!verifyingId} // Disable all verify buttons while one is in progress
                                        className="mt-4 w-full bg-teal-500 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-600 focus:outline-none transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    >
                                        {verifyingId === req.requestId ? 'Verifying on Blockchain...' : 'Verify Hospital'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 mt-4">No pending requests at the moment.</p>
                    )}
                </div>

                {/* Verified Hospitals Column */}
                <div>
                    <h2 className="text-2xl font-semibold text-slate-700 mb-4 border-b pb-2">Verified Hospitals</h2>
                    {verifiedHospitals.length > 0 ? (
                        <div className="space-y-4">
                            {verifiedHospitals.map((hospital) => (
                                <div key={hospital.hospitalId} className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                                    <h3 className="text-lg font-bold text-green-800">{hospital.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1">Hospital ID: {hospital.hospitalId}</p>
                                    <p className="text-sm text-slate-500 break-words">Admin: {hospital.adminAddress}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 mt-4">No hospitals have been verified yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

