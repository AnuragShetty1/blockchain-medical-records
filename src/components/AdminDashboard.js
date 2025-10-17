"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

// --- ICONS (omitted for brevity) ---
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m0 0a3.004 3.004 0 01-2.704-2.143M4.644 16.143a3.004 3.004 0 012.704-2.143m0 0a3 3 0 10-5.708 0m5.708 0a3 3 0 10-5.708 0m5.708 0a3 3 0 105.708 0m-5.708 0a3 3 0 105.708 0" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
const BadgeCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;


const StatusBadge = ({ status }) => {
    const statusStyles = {
        pending: 'bg-yellow-100 text-yellow-800',
        verifying: 'bg-blue-100 text-blue-800 animate-pulse',
        approved: 'bg-green-100 text-green-800',
        revoking: 'bg-red-100 text-red-800 animate-pulse',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status] || 'bg-slate-100 text-slate-800'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

export default function AdminDashboard() {
    const { userProfile } = useWeb3();
    const [requests, setRequests] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');

    const fetchData = useCallback(async () => {
        if (userProfile?.hospitalId === null || userProfile?.hospitalId === undefined) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // Fetch pending requests and verified professionals for the hospital
            const [requestsRes, professionalsRes] = await Promise.all([
                fetch(`http://localhost:3001/api/hospital-admin/requests/${userProfile.hospitalId}`),
                fetch(`http://localhost:3001/api/hospital-admin/professionals/${userProfile.hospitalId}`),
            ]);

            if (!requestsRes.ok || !professionalsRes.ok) {
                throw new Error('Failed to fetch hospital data.');
            }

            const requestsData = await requestsRes.json();
            const professionalsData = await professionalsRes.json();

            setRequests(requestsData.data || []);
            setProfessionals(professionalsData.data || []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error(error.message || "Could not fetch dashboard data.");
        } finally {
            setIsLoading(false);
        }
    }, [userProfile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleVerify = async (request) => {
        setProcessingId(request.address);
        const toastId = toast.loading(`Verifying ${request.name}...`);
        try {
            const response = await fetch('http://localhost:3001/api/hospital-admin/verify-professional', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professionalAddress: request.address,
                    hospitalId: userProfile.hospitalId,
                    role: request.role,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            toast.success(`${request.name} verified successfully!`, { id: toastId });
            
            // Optimistic UI update: Remove from requests, add to professionals
            setRequests(prev => prev.filter(r => r.address !== request.address));
            setProfessionals(prev => [...prev, { ...request, professionalStatus: 'approved' }]);

        } catch (error) {
            console.error("Verification failed:", error);
            toast.error(error.message || "Verification failed.", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };
    
    const handleRevoke = async (professional) => {
        setProcessingId(professional.address);
        const toastId = toast.loading(`Revoking access for ${professional.name}...`);
        try {
            const response = await fetch('http://localhost:3001/api/hospital-admin/revoke-professional', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professionalAddress: professional.address,
                    // FIX: Include hospitalId, which is required by the updated backend/contract logic.
                    hospitalId: userProfile.hospitalId, 
                    role: professional.role,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            toast.success(`Access for ${professional.name} has been revoked.`, { id: toastId });

            // Optimistic UI update: Remove from professionals
            setProfessionals(prev => prev.filter(p => p.address !== professional.address));

        } catch (error) {
            console.error("Revocation failed:", error);
            toast.error(error.message || "Revocation failed.", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCopyAddress = (address) => {
        // Using document.execCommand('copy') as navigator.clipboard.writeText() may not work in some environments
        const el = document.createElement('textarea');
        el.value = address;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('Address copied!');
    };

    const renderList = (items, isPending) => {
        if (isLoading) return <p className="p-10 text-center text-slate-500">Loading...</p>;
        if (items.length === 0) return <p className="p-10 text-center text-slate-500">{isPending ? "No pending requests." : "No verified professionals."}</p>;

        return (
            <ul className="divide-y divide-slate-200">
                {items.map((item) => (
                    <li key={item.address} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-grow">
                            <div className="flex items-center gap-3">
                                <p className="font-bold text-lg text-slate-800">{item.name}</p>
                                <StatusBadge status={item.professionalStatus} />
                            </div>
                            <p className="text-sm text-slate-500 mt-1">Role: <span className="font-semibold text-slate-600">{item.role}</span></p>
                            <div className="flex items-center gap-2 mt-2">
                                <p className="font-mono text-xs text-slate-400">{item.address}</p>
                                <button onClick={() => handleCopyAddress(item.address)} className="text-slate-500 hover:text-teal-600"><CopyIcon /></button>
                            </div>
                        </div>
                        <div className="w-full sm:w-auto flex-shrink-0">
                            {isPending ? (
                                <button
                                    onClick={() => handleVerify(item)}
                                    disabled={processingId === item.address}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-wait transition-all shadow-sm"
                                >
                                    <CheckCircleIcon />
                                    {processingId === item.address ? 'Verifying...' : 'Verify'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleRevoke(item)}
                                    disabled={processingId === item.address || item.professionalStatus === 'revoking'}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-wait transition-all shadow-sm"
                                >
                                    <XCircleIcon />
                                    {processingId === item.address ? 'Revoking...' : 'Revoke Access'}
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="w-full min-h-[calc(100vh-128px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Hospital Staff Management</h1>
                    <p className="mt-1 text-slate-500">Approve new professionals and manage your verified staff.</p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-200">
                        <nav className="-mb-px flex gap-6 px-6">
                            <button onClick={() => setActiveTab('pending')} className={`py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'pending' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                Pending Requests
                                <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{requests.length}</span>
                            </button>
                            <button onClick={() => setActiveTab('verified')} className={`py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'verified' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                Verified Professionals
                                <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{professionals.length}</span>
                            </button>
                        </nav>
                    </div>
                    
                    {activeTab === 'pending' ? renderList(requests, true) : renderList(professionals, false)}

                </div>
            </div>
        </div>
    );
}
