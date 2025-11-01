"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useWeb3 } from "@/context/Web3Context"; // [MODIFIED] Import useWeb3
import ConfirmationModal from './ConfirmationModal';
import toast from 'react-hot-toast'; // [NEW] Import toast for new actions

// --- STYLING (UNCHANGED) ---
const Spinner = ({ color = 'cyan-400' }) => (
    <svg className={`animate-spin -ml-1 mr-3 h-5 w-5 text-${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DashboardLoader = () => (
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center text-center p-8 font-sans">
        <Spinner color="cyan-400" />
        <h2 className="text-xl font-semibold text-[#E6EDF3] mt-4">Initializing Command Center...</h2>
        <p className="text-[#8B949E] text-sm mt-1">Fetching system status and requests.</p>
    </div>
);

// --- ICONS (UNCHANGED) ---
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const RejectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const RevokeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
const HospitalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const PendingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const StatusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
// [NEW] Icon for Sponsor Management
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 23.944a12.02 12.02 0 009-12.999c0-2.399-.78-4.596-2.074-6.311z" /></svg>;
const ShieldExclamationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;


export default function SuperAdminDashboard() {
    // [MODIFIED] Get signer from context. It will be present if admin is logged in with MetaMask.
    const { setTheme, signer } = useWeb3(); 
    const [pendingRequests, setPendingRequests] = useState([]);
    const [verifiedHospitals, setVerifiedHospitals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionStates, setActionStates] = useState({});
    const [activityLog, setActivityLog] = useState([]);
    const prevDataRef = useRef();

    // [NEW] State for Sponsor Management
    const [sponsorAddress, setSponsorAddress] = useState('');
    const [isSponsorLoading, setIsSponsorLoading] = useState(false);

    // --- 2. ADD MODAL STATE (UNCHANGED) ---
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        confirmText: 'Confirm',
        confirmColor: 'bg-indigo-600',
        isLoading: false
    });

    // This effect now controls the global theme (UNCHANGED)
    useEffect(() => {
        if (setTheme) setTheme('dark');
        return () => {
            if (setTheme) setTheme('default');
        };
    }, [setTheme]);


    const API_URL = 'http://localhost:3001/api/super-admin';

    const setActionState = (key, state) => {
        setActionStates(prev => ({ ...prev, [key]: state }));
    };

    // --- DATA FETCHING (UNCHANGED) ---
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

    // --- USE EFFECT HOOKS (UNCHANGED) ---
    useEffect(() => {
        fetchRequestsAndHospitals();
        const intervalId = setInterval(fetchRequestsAndHospitals, 5000);
        return () => clearInterval(intervalId);
    }, [fetchRequestsAndHospitals]);

    useEffect(() => {
        if (prevDataRef.current) {
            const { prevPending, prevVerified } = prevDataRef.current;
            const newLogs = [];

            prevPending.forEach(oldReq => {
                const stillPending = pendingRequests.some(newReq => newReq.requestId === oldReq.requestId);
                if (!stillPending) {
                    const wasVerified = verifiedHospitals.some(h => h.adminAddress === oldReq.requesterAddress);
                    const log = {
                        timestamp: new Date().toLocaleTimeString(),
                        message: `${oldReq.hospitalName} request was ${wasVerified ? 'VERIFIED' : 'REJECTED'}.`,
                        type: wasVerified ? 'success' : 'warning'
                    };
                    newLogs.push(log);
                }
            });

            prevVerified.forEach(oldHospital => {
                const stillVerified = verifiedHospitals.some(newH => newH.hospitalId === oldHospital.hospitalId);
                if (!stillVerified) {
                    const log = {
                        timestamp: new Date().toLocaleTimeString(),
                        message: `Access for ${oldHospital.name} was REVOKED.`,
                        type: 'error'
                    };
                    newLogs.push(log);
                }
            });

            if (newLogs.length > 0) {
                setActivityLog(prev => [...newLogs, ...prev].slice(0, 10));
            }
        }
        prevDataRef.current = { prevPending: pendingRequests, prevVerified: verifiedHospitals };
    }, [pendingRequests, verifiedHospitals]);

    // --- HOSPITAL MANAGEMENT FUNCTIONS (UNCHANGED) ---
    // These functions are insecure as they don't have authentication,
    // but leaving them as-is per your request to not break existing flows.
    const handleVerify = async (requestId, adminAddress) => {
        setError('');
        setActionState(`verify_${requestId}`, true);
        setModalState(prev => ({ ...prev, isLoading: true }));
        try {
            await axios.post(`${API_URL}/verify-hospital`, { requestId, adminAddress });
            await fetchRequestsAndHospitals();
        } catch (err) {
            console.error("Error verifying hospital:", err);
            setError(err.response?.data?.message || 'A critical error occurred during verification.');
            setActionState(`verify_${requestId}`, false);
        } finally {
            closeModal();
        }
    };

    const handleReject = async (requestId) => {
        setError('');
        setActionState(`reject_${requestId}`, true);
        setModalState(prev => ({ ...prev, isLoading: true }));
        try {
            await axios.post(`${API_URL}/reject-hospital`, { requestId });
            await fetchRequestsAndHospitals();
        } catch (err) {
            console.error("Error rejecting hospital:", err);
            setError(err.response?.data?.message || 'A critical error occurred during rejection.');
            setActionState(`reject_${requestId}`, false);
        } finally {
            closeModal();
        }
    };

    const handleRevoke = async (hospitalId) => {
        setError('');
        setActionState(`revoke_${hospitalId}`, true);
        setModalState(prev => ({ ...prev, isLoading: true }));
        try {
            await axios.post(`${API_URL}/revoke-hospital`, { hospitalId });
            await fetchRequestsAndHospitals();
        } catch (err) {
            console.error("Error revoking hospital:", err);
            setError(err.response?.data?.message || 'A critical error occurred during revocation.');
            setActionState(`revoke_${hospitalId}`, false);
        } finally {
            closeModal();
        }
    };

    // --- MODAL HELPER FUNCTIONS (UNCHANGED) ---
    const openVerifyModal = (requestId, requesterAddress, hospitalName) => {
        setModalState({
            isOpen: true,
            title: 'Confirm Hospital Verification',
            message: `Are you sure you want to verify ${hospitalName} (${requesterAddress})? This will allow them to access the system.`,
            onConfirm: () => handleVerify(requestId, requesterAddress),
            confirmText: 'Verify',
            confirmColor: 'bg-green-600',
            isLoading: false
        });
    };

    const openRejectModal = (requestId, hospitalName) => {
        setModalState({
            isOpen: true,
            title: 'Confirm Hospital Rejection',
            message: `Are you sure you want to reject ${hospitalName}? They will not be able to access the system.`,
            onConfirm: () => handleReject(requestId),
            confirmText: 'Reject',
            confirmColor: 'bg-red-600',
            isLoading: false
        });
    };

    const openRevokeModal = (hospitalId, hospitalName) => {
        setModalState({
            isOpen: true,
            title: 'Confirm Hospital Revocation',
            message: `Are you sure you want to REVOKE access for ${hospitalName}? This is a destructive action and will immediately lock them out.`,
            onConfirm: () => handleRevoke(hospitalId),
            confirmText: 'Yes, Revoke Access',
            confirmColor: 'bg-red-800', // Stronger red
            isLoading: false
        });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, onConfirm: () => { }, isLoading: false });
    };

    // --- [NEW] SPONSOR MANAGEMENT FUNCTIONS ---

    /**
     * @brief A generic helper for sending a signature-authenticated admin request.
     * This is the "Model 2" (Web 3.0 Admin) flow.
     */
    const executeSponsorAction = async (action) => {
        if (!signer) {
            toast.error("Signer (MetaMask) not found. Please ensure you are connected.");
            return;
        }
        if (!sponsorAddress) {
            toast.error("Please enter a wallet address.");
            return;
        }

        setIsSponsorLoading(true);
        const toastId = toast.loading("Waiting for wallet signature...");

        try {
            // 1. Define the message to sign
            const message = `Confirming Super Admin Action: ${action} for ${sponsorAddress}`;

            // 2. Get signature from user (Admin)
            const signature = await signer.signMessage(message);
            toast.loading("Signature received. Processing on backend...", { id: toastId });

            // 3. Send signature and payload to the backend
            const endpoint = action === 'GRANT' ? 'grant-sponsor' : 'revoke-sponsor';
            await axios.post(`${API_URL}/${endpoint}`, {
                address: sponsorAddress,
                signature: signature
            });

            toast.success(`Sponsor role ${action.toLowerCase()}ed successfully!`, { id: toastId });
            setSponsorAddress(''); // Clear input on success

        } catch (err) {
            // Handle errors
            if (err.code === 4001) { // User rejected signature in MetaMask
                toast.error("Action rejected. Signature was cancelled.", { id: toastId });
            } else {
                console.error(`Error during ${action} sponsor:`, err);
                const message = err.response?.data?.message || "An unknown error occurred.";
                toast.error(`Failed: ${message}`, { id: toastId });
            }
        } finally {
            setIsSponsorLoading(false);
        }
    };

    // --- END OF NEW FUNCTIONS ---


    if (isLoading) {
        return <DashboardLoader />;
    }

    const ActivityLogItem = ({ log }) => {
        // ... (unchanged)
        const baseClasses = "flex items-start gap-3 p-2 rounded-md text-sm";
        const styles = {
            success: 'bg-green-500/10 text-green-400',
            warning: 'bg-amber-500/10 text-amber-400',
            error: 'bg-red-500/10 text-red-400',
        };
        return (
            <div className={`${baseClasses} ${styles[log.type]}`}>
                <span className="font-mono text-gray-500">{log.timestamp}</span>
                <p>{log.message}</p>
            </div>
        );
    };

    return (
        <div className="min-h-[calc(100vh-121px)] w-[110%] bg-[#0D1117] p-4 md:p-8 font-sans animated-gradient">
            <style jsx global>{`
                /* ... (unchanged) ... */
                @keyframes gradient-animation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animated-gradient {
                    background: linear-gradient(-45deg, #0D1117, #012a4a, #0D1117, #240046);
                    background-size: 400% 400%;
                    animation: gradient-animation 10s ease infinite;
                }
            `}</style>

            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#E6EDF3] tracking-wider">System Command Center</h1>
                    <p className="text-sm text-[#8B949E] mt-1">Oversee and manage all hospital network participants.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* ... (unchanged Verified Hospitals card) ... */}
                    <div className="bg-[#161B22]/70 backdrop-blur-sm p-4 rounded-lg border border-gray-800 flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-full border border-green-500/30"><HospitalIcon className="text-green-400" /></div>
                        <div>
                            <p className="text-sm text-[#8B949E]">Verified Hospitals</p>
                            <p className="text-2xl font-bold text-[#E6EDF3]">{verifiedHospitals.length}</p>
                        </div>
                    </div>
                    {/* ... (unchanged Pending Requests card) ... */}
                    <div className="bg-[#161B22]/70 backdrop-blur-sm p-4 rounded-lg border border-gray-800 flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/20 rounded-full border border-cyan-500/30"><PendingIcon className="text-cyan-400" /></div>
                        <div>
                            <p className="text-sm text-[#8B949E]">Pending Requests</p>
                            <p className="text-2xl font-bold text-[#E6EDF3]">{pendingRequests.length}</p>
                        </div>
                    </div>
                    {/* ... (unchanged System Status card) ... */}
                    <div className="bg-[#161B22]/70 backdrop-blur-sm p-4 rounded-lg border border-gray-800 flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-full border border-purple-500/30"><StatusIcon className="text-purple-400" /></div>
                        <div>
                            <p className="text-sm text-[#8B949E]">System Status</p>
                            <p className="text-2xl font-bold text-green-400">Operational</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-xl font-semibold text-[#E6EDF3] mb-4 border-b-2 border-cyan-500/30 pb-2">Action Required</h2>
                            {/* ... (unchanged Pending Requests list) ... */}
                            {pendingRequests.length > 0 ? (
                                <div className="space-y-4">
                                    {pendingRequests.map((req) => (
                                        <div key={req.requestId} className="bg-[#161B22]/70 backdrop-blur-sm p-5 rounded-lg border border-gray-800 transition-all duration-300 hover:border-cyan-500/50 hover:scale-[1.02]">
                                            <h3 className="text-lg font-bold text-cyan-400">{req.hospitalName}</h3>
                                            <p className="text-sm text-[#8B949E] mt-2 font-mono break-words">Request ID: {req.requestId}</p>
                                            <p className="text-sm text-[#8B949E] font-mono break-words">Admin: {req.requesterAddress}</p>
                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                <button onClick={() => openVerifyModal(req.requestId, req.requesterAddress, req.hospitalName)} disabled={actionStates[`verify_${req.requestId}`] || actionStates[`reject_${req.requestId}`]} className="flex items-center justify-center gap-2 bg-green-600/80 border border-green-500/50 text-white font-bold py-2 px-4 rounded-md hover:bg-green-500 focus:outline-none transition-all hover:scale-105 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:cursor-not-allowed">
                                                    {actionStates[`verify_${req.requestId}`] ? <><Spinner color="white" /> Verifying...</> : <><CheckIcon /> Verify</>}
                                                </button>
                                                <button onClick={() => openRejectModal(req.requestId, req.hospitalName)} disabled={actionStates[`verify_${req.requestId}`] || actionStates[`reject_${req.requestId}`]} className="flex items-center justify-center gap-2 bg-amber-600/80 border border-amber-500/50 text-white font-bold py-2 px-4 rounded-md hover:bg-amber-500 focus:outline-none transition-all hover:scale-105 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:cursor-not-allowed">
                                                    {actionStates[`reject_${req.requestId}`] ? <><Spinner color="white" /> Rejecting...</> : <><RejectIcon /> Reject</>}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#161B22]/70 backdrop-blur-sm p-5 rounded-lg border border-gray-800 text-center">
                                    <p className="text-[#8B949E] italic">No pending requests at the moment.</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-[#E6EDF3] mb-4 border-b-2 border-green-500/30 pb-2">Network Participants</h2>
                            {/* ... (unchanged Verified Hospitals list) ... */}
                            {verifiedHospitals.length > 0 ? (
                                <div className="space-y-4">
                                    {verifiedHospitals.map((hospital) => (
                                        <div key={hospital.hospitalId} className="bg-[#161B22]/70 backdrop-blur-sm p-5 rounded-lg border border-gray-800 transition-all duration-300 hover:border-red-500/50 hover:scale-[1.02]">
                                            <h3 className="text-lg font-bold text-green-400">{hospital.name}</h3>
                                            <p className="text-sm text-[#8B949E] mt-2 font-mono break-words">Hospital ID: {hospital.hospitalId}</p>
                                            <p className="text-sm text-[#8B949E] font-mono break-words">Admin: {hospital.adminAddress}</p>
                                            <button onClick={() => openRevokeModal(hospital.hospitalId, hospital.name)} disabled={actionStates[`revoke_${hospital.hospitalId}`]} className="mt-4 w-full flex items-center justify-center gap-2 bg-red-600/80 border border-red-500/50 text-white font-bold py-2 px-4 rounded-md hover:bg-red-500 focus:outline-none transition-all hover:scale-105 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:cursor-not-allowed">
                                                {actionStates[`revoke_${hospital.hospitalId}`] ? <><Spinner color="white" /> Revoking...</> : <><RevokeIcon /> Revoke Access</>}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#161B22]/70 backdrop-blur-sm p-5 rounded-lg border border-gray-800 text-center">
                                    <p className="text-[#8B949E] italic">No hospitals have been verified yet.</p>
                                </div>
                            )}
                        </div>

                        {/* --- [NEW] SPONSOR MANAGEMENT UI --- */}
                        <div className="md:col-span-2">
                             <h2 className="text-xl font-semibold text-[#E6EDF3] mb-4 border-b-2 border-orange-500/30 pb-2">Sponsor Wallet Management</h2>
                             <div className="bg-[#161B22]/70 backdrop-blur-sm p-5 rounded-lg border border-gray-800">
                                <p className="text-sm text-[#8B949E] mb-4">
                                    Authorize or revoke a wallet address to act as a "Sponsor" (i.e., pay gas fees) for user transactions. This is a high-privilege action.
                                </p>
                                <div className="space-y-3">
                                    <label htmlFor="sponsor_address" className="block text-sm font-medium text-gray-300">Sponsor Wallet Address</label>
                                    <input
                                        type="text"
                                        id="sponsor_address"
                                        value={sponsorAddress}
                                        onChange={(e) => setSponsorAddress(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full px-3 py-2 bg-[#0D1117] border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                                        disabled={isSponsorLoading}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => executeSponsorAction('GRANT')}
                                            disabled={isSponsorLoading}
                                            className="flex items-center justify-center gap-2 bg-cyan-600/80 border border-cyan-500/50 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 focus:outline-none transition-all hover:scale-105 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:cursor-not-allowed"
                                        >
                                            {isSponsorLoading ? <Spinner color="white" /> : <ShieldCheckIcon />}
                                            Grant Role
                                        </button>
                                        <button
                                            onClick={() => executeSponsorAction('REVOKE')}
                                            disabled={isSponsorLoading}
                                            className="flex items-center justify-center gap-2 bg-red-600/80 border border-red-500/50 text-white font-bold py-2 px-4 rounded-md hover:bg-red-500 focus:outline-none transition-all hover:scale-105 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:cursor-not-allowed"
                                        >
                                            {isSponsorLoading ? <Spinner color="white" /> : <ShieldExclamationIcon />}
                                            Revoke Role
                                        </button>
                                    </div>
                                </div>
                             </div>
                        </div>
                         {/* --- END OF NEW UI --- */}

                    </div>

                    <div className="lg:col-span-1">
                        <h2 className="text-xl font-semibold text-[#E6EDF3] mb-4 border-b-2 border-purple-500/30 pb-2">Recent Activity</h2>
                        {/* ... (unchanged Activity Log) ... */}
                        <div className="bg-[#161B22]/70 backdrop-blur-sm p-4 rounded-lg border border-gray-800 space-y-3 h-[calc(100%-44px)] overflow-y-auto">
                            {activityLog.length > 0 ? activityLog.map((log, index) => (
                                <ActivityLogItem key={index} log={log} />
                            )) : (
                                <p className="text-[#8B949E] italic text-center pt-4">No recent system activity.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 5. ADD MODAL JSX (UNCHANGED) --- */}
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={() => {
                    modalState.onConfirm();
                }}
                title={modalState.title}
                message={modalState.message}
                confirmText={modalState.confirmText}
                confirmColor={modalState.confirmColor}
                isLoading={modalState.isLoading}
            />
        </div>
    );
}
