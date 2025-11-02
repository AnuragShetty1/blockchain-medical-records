"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Changing path to absolute path relative to project root (assuming /src)
import { useWeb3 } from '/src/context/Web3Context.js'; 
import toast from 'react-hot-toast';
import { Check, X, Copy, Users, Hourglass, Building, Loader2, Info, UserCheck, ShieldOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

// --- HELPER COMPONENT: StatusBadge (Enhanced) ---
const StatusBadge = ({ status }) => {
    const statusStyles = {
        pending: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
        verifying: 'bg-blue-100 text-blue-800 ring-blue-600/20 animate-pulse',
        approved: 'bg-green-100 text-green-800 ring-green-600/20',
        revoking: 'bg-red-100 text-red-800 ring-red-600/20 animate-pulse',
        rejected: 'bg-gray-100 text-gray-500 ring-gray-400/20',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// --- HELPER COMPONENT: ConfirmationModal (Replacement for external import) ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor, isLoading }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 transition-opacity flex justify-center items-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 50 }}
                    className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 transform transition-all"
                >
                    <div className="text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                            <Info className="h-6 w-6 text-blue-600" aria-hidden="true" />
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-gray-900">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">{message}</p>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`inline-flex items-center justify-center gap-2 rounded-md ${confirmColor} px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:bg-gray-400 disabled:cursor-wait`}
                            onClick={onConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// --- HELPER COMPONENT: AdminHeader ---
const AdminHeader = ({ userProfile }) => (
    <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 flex items-center gap-4"
    >
        <div className="bg-blue-100 text-blue-600 p-3 rounded-lg flex-shrink-0">
            <Building className="h-8 w-8" />
        </div>
        <div>
            {!userProfile ? (
                <div className="animate-pulse">
                    <div className="h-8 w-64 bg-gray-200 rounded-md"></div>
                    <div className="h-5 w-80 bg-gray-200 rounded-md mt-2"></div>
                </div>
            ) : (
                <>
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        {userProfile?.hospitalName || 'Hospital Admin'}
                    </h1>
                    <p className="mt-1 text-lg text-gray-600">
                        Staff Credentialing and Access Management Portal
                    </p>
                </>
            )}
        </div>
    </motion.div>
);

// --- HELPER COMPONENT: StatCard ---
const StatCard = ({ title, count, icon: Icon, colorClass, delay }) => (
    <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: delay }}
        className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
    >
        <div className="flex items-center">
            {/* Darker color class for icons for contrast */}
            <div className={`${colorClass} p-3 rounded-full flex-shrink-0 text-white`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-4xl font-extrabold text-gray-900">{count}</p>
            </div>
        </div>
    </motion.div>
);


// --- MAIN COMPONENT: AdminDashboard ---
export default function AdminDashboard() {
    // FIX: Context import is now absolute path to /src
    const { userProfile } = useWeb3(); 
    const [requests, setRequests] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');

    // --- MODAL STATE (Kept Logic) ---
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        confirmText: '',
        confirmColor: 'bg-indigo-600 hover:bg-indigo-700',
    });

    const closeModal = () => {
        if (processingId) return;
        setModalState({ ...modalState, isOpen: false });
    };

    const openConfirm = (actionType, item) => {
        let title, message, onConfirm, confirmText, confirmColor;

        switch (actionType) {
            case 'verify':
                title = 'Approve Professional';
                message = `Are you sure you want to approve ${item.name}? This will grant them access as a ${item.role}.`;
                onConfirm = () => handleVerify(item);
                confirmText = 'Approve';
                confirmColor = 'bg-green-600 hover:bg-green-700';
                break;
            case 'reject':
                title = 'Reject Request';
                message = `Are you sure you want to reject the request from ${item.name}? This action cannot be undone.`;
                onConfirm = () => handleReject(item);
                confirmText = 'Reject';
                confirmColor = 'bg-red-600 hover:bg-red-700';
                break;
            case 'revoke':
                title = 'Revoke Access';
                message = `Are you sure you want to revoke all access for ${item.name}? They will be immediately disconnected.`;
                onConfirm = () => handleRevoke(item);
                confirmText = 'Revoke Access';
                confirmColor = 'bg-red-600 hover:bg-red-700';
                break;
            default:
                return;
        }

        setModalState({
            isOpen: true,
            title,
            message,
            onConfirm,
            confirmText,
            confirmColor
        });
    };
    // --- END OF MODAL STATE ---


    // --- DATA FETCHING (Logic Preserved) ---
    const fetchData = useCallback(async () => {
        if (userProfile?.hospitalId === null || userProfile?.hospitalId === undefined) {
            setIsLoading(false);
            return;
        }

        // Only show loading indicator if we haven't loaded data yet
        if (requests.length === 0 && professionals.length === 0) {
            setIsLoading(true);
        }

        try {
            const [requestsRes, professionalsRes] = await Promise.all([
                fetch(`http://localhost:3001/api/hospital-admin/requests/${userProfile.hospitalId}`),
                fetch(`http://localhost:3001/api/hospital-admin/professionals/${userProfile.hospitalId}`),
            ]);

            if (!requestsRes.ok || !professionalsRes.ok) {
                // Read and throw the error message from the response if available
                const errorData = await Promise.all([requestsRes.json(), professionalsRes.json()]);
                throw new Error(errorData[0].message || errorData[1].message || 'Failed to fetch hospital data.');
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

    // --- TRANSACTION HANDLERS (Logic Preserved) ---
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
            closeModal();
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
            closeModal();
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
            closeModal();
        }
    };
    // --- END OF TRANSACTION HANDLERS ---

    // --- UTILITY (Kept Logic) ---
    const handleCopyAddress = (address) => {
        const el = document.createElement('textarea');
        el.value = address;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('Address copied!');
    };

    // --- RENDER LIST (Refactored Table UI) ---
    const renderList = (items, isPendingList) => {
        if (isLoading && items.length === 0) return (
            <div className="p-10 text-center text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                <p className="mt-4">Loading professionals...</p>
            </div>
        );

        if (items.length === 0) return (
            <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-b-2xl">
                <div className="flex justify-center mb-4">
                    {isPendingList ? <Hourglass size={48} className="text-gray-300" /> : <Users size={48} className="text-gray-300" />}
                </div>
                <p className="font-semibold text-xl text-gray-800">{isPendingList ? "No Pending Requests" : "No Verified Professionals"}</p>
                <p className="text-sm mt-1">{isPendingList ? "New professionals seeking affiliation will appear here." : "Approved staff members with access are listed here."}</p>
            </div>
        );

        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="overflow-x-auto"
            >
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Professional</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role & Status</th>
                            <th scope="col" className="relative px-6 py-4">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {items.map((item, index) => {
                            const isProcessing = processingId === item.address;
                            return (
                                <motion.tr 
                                    key={item.address} 
                                    variants={itemVariants}
                                    className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/70`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-bold text-base text-gray-800">{item.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="font-mono text-xs text-gray-400">{`${item.address.substring(0, 6)}...${item.address.substring(item.address.length - 4)}`}</p>
                                            <button 
                                                onClick={() => handleCopyAddress(item.address)} 
                                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                                aria-label="Copy Address"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-600">Role: <span className="font-semibold text-gray-700">{item.role}</span></div>
                                        <div className="mt-1">
                                            <StatusBadge status={item.professionalStatus} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {isPendingList ? (
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => openConfirm('reject', item)}
                                                    disabled={isProcessing || item.professionalStatus === 'verifying'}
                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 font-semibold text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-wait transition-all shadow-sm"
                                                >
                                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => openConfirm('verify', item)}
                                                    disabled={isProcessing || item.professionalStatus === 'verifying'}
                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 font-semibold text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-wait transition-all shadow-md"
                                                >
                                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                    {item.professionalStatus === 'verifying' ? 'Verifying...' : 'Approve'}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => openConfirm('revoke', item)}
                                                disabled={isProcessing || item.professionalStatus === 'revoking'}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 font-semibold text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-wait transition-all shadow-md ml-auto"
                                            >
                                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />}
                                                {item.professionalStatus === 'revoking' ? 'Revoking...' : 'Revoke Access'}
                                            </button>
                                        )}
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            {/* The wrapper now takes full width as requested */}
            <div className="w-full mx-auto space-y-8">
                
                {/* REFACTORED HEADER */}
                <AdminHeader userProfile={userProfile} />

                {/* HIGH-IMPACT STAT CARDS */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <StatCard 
                        title="Pending Verification" 
                        count={requests.length} 
                        icon={Hourglass} 
                        // Using a slightly darker background color for better icon visibility
                        colorClass="bg-yellow-600"
                        delay={0.1}
                    />
                    <StatCard 
                        title="Verified Professionals" 
                        count={professionals.length} 
                        icon={UserCheck} 
                        colorClass="bg-green-700"
                        delay={0.2}
                    />
                </motion.div>

                {/* MAIN MANAGEMENT CARD (Tab Navigation + List) */}
                <motion.div
                    className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.3 }}
                >
                    {/* Tab Navigation is integrated into the Card Header */}
                    <div className="border-b border-gray-200">
                        <nav className="flex gap-6 px-6 sm:px-8">
                            {['pending', 'verified'].map(tabId => {
                                const Icon = tabId === 'pending' ? Hourglass : Users;
                                const label = tabId === 'pending' ? 'Pending Requests' : 'Verified Professionals';
                                
                                return (
                                    <button 
                                        key={tabId} 
                                        onClick={() => setActiveTab(tabId)} 
                                        className={`py-4 px-1 border-b-2 font-semibold text-base flex items-center gap-2 transition-colors relative ${activeTab === tabId 
                                            ? 'border-blue-600 text-blue-600' 
                                            : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                                    >
                                        <Icon size={18} />
                                        {label}
                                        {activeTab === tabId && (
                                            <motion.div
                                                layoutId="adminTabIndicator"
                                                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full"
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'pending' ? renderList(requests, true) : renderList(professionals, false)}
                        </motion.div>
                    </AnimatePresence>

                </motion.div>
            </div>

            {/* CONFIRMATION MODAL (Required by the original logic) */}
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
                confirmText={modalState.confirmText}
                confirmColor={modalState.confirmColor}
                isLoading={processingId !== null} 
            />
        </div>
    );
}
