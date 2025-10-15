"use client";
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Spinner = ({ color = 'white' }) => (
    <svg className={`animate-spin -ml-1 mr-3 h-5 w-5 text-${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default function SuperAdminDashboard() {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [verifiedHospitals, setVerifiedHospitals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = 'http://localhost:3001/api/super-admin';

    const fetchRequestsAndHospitals = useCallback(async () => {
        try {
            const requestsResponse = await axios.get(`${API_URL}/requests`);
            const hospitalsResponse = await axios.get(`${API_URL}/hospitals`);
            setPendingRequests(requestsResponse.data.data || []);
            setVerifiedHospitals(hospitalsResponse.data.data || []);
            setError('');
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.response?.data?.message || 'Failed to fetch data. The server might be down.');
        } finally {
            if (isLoading) {
                setIsLoading(false);
            }
        }
    }, [isLoading]);

    useEffect(() => {
        fetchRequestsAndHospitals();
        const intervalId = setInterval(fetchRequestsAndHospitals, 5000);
        return () => clearInterval(intervalId);
    }, [fetchRequestsAndHospitals]);


    const handleVerify = async (requestId, adminAddress) => {
        setError('');
        try {
            const response = await axios.post(`${API_URL}/verify-hospital`, {
                requestId,
                adminAddress
            });
            if (response.data.success) {
                // --- [THE FIX] ---
                // Immediately fetch data to show the 'verifying' state.
                await fetchRequestsAndHospitals();
            } else {
               throw new Error(response.data.message || 'Verification failed.');
            }
        } catch (err) {
            console.error("Error verifying hospital:", err);
            setError(err.response?.data?.message || 'A critical error occurred during verification.');
        }
    };

    const handleRevoke = async (hospitalId) => {
        setError('');
        try {
            const response = await axios.post(`${API_URL}/revoke-hospital`, {
                hospitalId
            });
            if (response.data.success) {
                // --- [THE FIX] ---
                // Immediately fetch data to show the 'revoking' state.
                await fetchRequestsAndHospitals();
            } else {
                throw new Error(response.data.message || 'Revocation failed.');
            }
        } catch (err) {
            console.error("Error revoking hospital:", err);
            setError(err.response?.data?.message || 'A critical error occurred during revocation.');
        }
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading dashboard...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 bg-slate-50 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Super Admin Dashboard</h1>
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending & Verifying Requests Column */}
                <div>
                    <h2 className="text-2xl font-semibold text-slate-700 mb-4 border-b pb-2">Pending Hospital Requests</h2>
                    {pendingRequests.length > 0 ? (
                        <div className="space-y-4">
                            {pendingRequests.map((req) => (
                                <div key={req.requestId} className={`bg-white p-4 rounded-lg shadow-sm border ${req.status === 'verifying' ? 'border-blue-300' : 'border-slate-200'}`}>
                                    <h3 className="text-lg font-bold text-slate-800">{req.hospitalName}</h3>
                                    <p className="text-sm text-slate-500 mt-1">Request ID: {req.requestId}</p>
                                    <p className="text-sm text-slate-500 break-words">Admin: {req.requesterAddress}</p>
                                    <button
                                        onClick={() => handleVerify(req.requestId, req.requesterAddress)}
                                        disabled={req.status === 'verifying'}
                                        className="mt-4 w-full flex items-center justify-center bg-teal-500 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-600 focus:outline-none transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                                    >
                                        {req.status === 'verifying' ? (
                                            <>
                                                <Spinner />
                                                Verifying on Blockchain...
                                            </>
                                        ) : 'Verify Hospital'}
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
                                <div key={hospital.hospitalId} className={`bg-white p-4 rounded-lg shadow-sm border ${hospital.status === 'revoking' ? 'border-red-300' : 'border-green-200'}`}>
                                    <h3 className={`text-lg font-bold ${hospital.status === 'revoking' ? 'text-red-800' : 'text-green-800'}`}>{hospital.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1">Hospital ID: {hospital.hospitalId}</p>
                                    <p className="text-sm text-slate-500 break-words">Admin: {hospital.adminAddress}</p>
                                    <button
                                        onClick={() => handleRevoke(hospital.hospitalId)}
                                        disabled={hospital.status === 'revoking'}
                                        className="mt-4 w-full flex items-center justify-center bg-red-500 text-white font-bold py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
                                    >
                                        {hospital.status === 'revoking' ? (
                                            <>
                                                <Spinner />
                                                Revoking on Blockchain...
                                            </>
                                        ) : 'Revoke Hospital'}
                                    </button>
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

