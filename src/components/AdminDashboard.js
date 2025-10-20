"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
// We'll use lucide-react for a professional icon set.
// Make sure to install it: npm install lucide-react
import { Check, X, Copy, Users, Hourglass, Building } from 'lucide-react';

const StatusBadge = ({ status }) => {
    const statusStyles = {
        pending: 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
        verifying: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20 animate-pulse',
        approved: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20',
        revoking: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20 animate-pulse',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// --- STATIC "MODERN CLINICAL" BACKGROUND ---
const StaticClinicalBackground = () => {
    const svgGridPattern = encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>
            <path d='M0 1 L40 1 M1 0 L1 40' stroke='#E0E7FF' stroke-width='0.5'/>
        </svg>
    `);

    return (
        <>
            <style jsx global>{`
                .clinical-background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: -1;
                    background-color: #F9FAFB; /* slate-50 */
                    background-image: 
                        linear-gradient(to bottom, rgba(240, 245, 255, 0.8), rgba(255, 255, 255, 1)),
                        url("data:image/svg+xml,${svgGridPattern}");
                }
            `}</style>
            <div className="clinical-background" aria-hidden="true"></div>
        </>
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

        if (requests.length === 0 && professionals.length === 0) {
            setIsLoading(true);
        }

        try {
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
    }, [userProfile, requests.length, professionals.length]);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    const handleVerify = async (request) => {
        setProcessingId(request.address);
        const toastId = toast.loading(`Initiating verification for ${request.name}...`);
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
            toast.success(`Verification process started for ${request.name}.`, { id: toastId });
            await fetchData();
        } catch (error) {
            console.error("Verification failed:", error);
            toast.error(error.message || "Verification failed.", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleRevoke = async (professional) => {
        setProcessingId(professional.address);
        const toastId = toast.loading(`Initiating revocation for ${professional.name}...`);
        try {
            const response = await fetch('http://localhost:3001/api/hospital-admin/revoke-professional', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professionalAddress: professional.address,
                    hospitalId: userProfile.hospitalId,
                    role: professional.role,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            toast.success(`Revocation process started for ${professional.name}.`, { id: toastId });
            await fetchData();
        } catch (error) {
            console.error("Revocation failed:", error);
            toast.error(error.message || "Revocation failed.", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (request) => {
        setProcessingId(request.address);
        const toastId = toast.loading(`Rejecting request for ${request.name}...`);
        try {
            const response = await fetch('http://localhost:3001/api/hospital-admin/reject-professional', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professionalAddress: request.address,
                    hospitalId: userProfile.hospitalId,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            toast.success(`Request for ${request.name} has been rejected.`, { id: toastId });
            await fetchData();
        } catch (error) {
            console.error("Rejection failed:", error);
            toast.error(error.message || "Rejection failed.", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCopyAddress = (address) => {
        const el = document.createElement('textarea');
        el.value = address;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('Address copied!');
    };

    const renderList = (items, isPendingList) => {
        if (isLoading && items.length === 0) return <div className="p-10 text-center text-gray-500">Loading professionals...</div>;
        if (items.length === 0) return (
            <div className="p-10 text-center text-gray-500">
                <div className="flex justify-center mb-4">
                    {isPendingList ? <Hourglass size={48} className="text-gray-300" /> : <Users size={48} className="text-gray-300" />}
                </div>
                <p className="font-semibold">{isPendingList ? "No Pending Requests" : "No Verified Professionals"}</p>
                <p className="text-sm mt-1">{isPendingList ? "New requests from professionals will appear here." : "Approved professionals will be listed here."}</p>
            </div>
        );

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-100/80">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Professional</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Role & Status</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.address} className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-sky-100/50`}>
                                <td className="px-6 py-4 whitespace-nowrap border-b border-slate-200">
                                    <div className="font-bold text-base text-slate-800">{item.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="font-mono text-xs text-slate-400">{`${item.address.substring(0, 6)}...${item.address.substring(item.address.length - 4)}`}</p>
                                        <button onClick={() => handleCopyAddress(item.address)} className="text-slate-400 hover:text-sky-600 transition-colors">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap border-b border-slate-200">
                                    <div className="text-sm text-slate-600">Role: <span className="font-semibold text-slate-700">{item.role}</span></div>
                                    <div className="mt-1">
                                        <StatusBadge status={item.professionalStatus} />
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-b border-slate-200">
                                    {isPendingList ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleReject(item)}
                                                disabled={processingId === item.address || item.professionalStatus === 'verifying'}
                                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 font-semibold text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-wait transition-all shadow-sm"
                                            >
                                                <X size={16} />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleVerify(item)}
                                                disabled={processingId === item.address || item.professionalStatus === 'verifying'}
                                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 font-semibold text-sm text-white bg-green-500 rounded-md hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-wait transition-all shadow-sm"
                                            >
                                                <Check size={16} />
                                                {item.professionalStatus === 'verifying' ? 'Verifying...' : 'Approve'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleRevoke(item)}
                                            disabled={processingId === item.address || item.professionalStatus === 'revoking'}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 font-semibold text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-wait transition-all shadow-sm"
                                        >
                                            <X size={16} />
                                            {item.professionalStatus === 'revoking' ? 'Revoking...' : 'Revoke Access'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="relative w-full min-h-[calc(100vh-128px)]">
            <StaticClinicalBackground />
            <div className="relative z-10 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    
                    {/* Simplified Page Header */}
                    <div className="mb-8">
                        {!userProfile ? (
                             <div className="animate-pulse">
                                <div className="h-8 w-1/2 bg-slate-200 rounded-md"></div>
                                <div className="h-5 w-1/3 bg-slate-200 rounded-md mt-3"></div>
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-4xl font-bold text-slate-900">{userProfile?.hospitalName || 'Hospital Dashboard'}</h1>
                                <p className="mt-2 text-lg text-slate-500">
                                    Welcome to your staff management portal.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* High-Impact Statistic Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center">
                                <div className="bg-yellow-100 p-3 rounded-full">
                                    <Hourglass className="h-6 w-6 text-yellow-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-slate-500">Pending Requests</p>
                                    <p className="text-3xl font-bold text-slate-900">{requests.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center">
                                <div className="bg-green-100 p-3 rounded-full">
                                    <Users className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-slate-500">Verified Professionals</p>
                                    <p className="text-3xl font-bold text-slate-900">{professionals.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Table Card */}
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 overflow-hidden ring-1 ring-black ring-opacity-5">
                        <div className="border-b border-slate-900/10">
                            <nav className="-mb-px flex gap-6 px-6">
                                <button onClick={() => setActiveTab('pending')} className={`py-4 px-1 border-b-2 font-semibold text-base flex items-center gap-2 transition-colors ${activeTab === 'pending' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
                                    <Hourglass size={18} />
                                    Pending Requests
                                </button>
                                <button onClick={() => setActiveTab('verified')} className={`py-4 px-1 border-b-2 font-semibold text-base flex items-center gap-2 transition-colors ${activeTab === 'verified' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
                                    <Users size={18} />
                                    Verified Professionals
                                </button>
                            </nav>
                        </div>
                        
                        {activeTab === 'pending' ? renderList(requests, true) : renderList(professionals, false)}
                    </div>
                </div>
            </div>
        </div>
    );
}

