"use client";

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal'; // <-- 1. IMPORT MODAL

// --- ICONS ---
const RevokeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
const SpinnerWhite = () => <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>;
// --- NEW ICONS for the professional table view ---
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM3.75 18.75a3 3 0 013-3h1.5a3 3 0 013 3v.75A3.75 3.75 0 0112 22.5h-2.25a3.75 3.75 0 01-3.75-3.75V18.75z" /></svg>;

// --- NEW HELPER: For creating a professional skeleton loader ---
const TableSkeleton = () => (
    <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg animate-pulse">
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-24"></div>
            </div>
        ))}
    </div>
);


export default function AccessManagement() {
    // --- STATE AND LOGIC (UNCHANGED) ---
    const { account, contract } = useWeb3();
    const [grants, setGrants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRevoking, setIsRevoking] = useState(null); // Keep this for button loading state

    // --- 2. ADD MODAL STATE ---
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        confirmText: '',
        confirmColor: 'bg-indigo-600',
    });

    // Function to close the modal (respecting the loading state)
    const closeModal = () => {
        if (isRevoking) return; // Use existing loading state
        setModalState({ ...modalState, isOpen: false });
    };

    // Function to open the modal for revoke action
    const openConfirm = (grant) => {
        setModalState({
            isOpen: true,
            title: 'Revoke Access',
            message: `Are you sure you want to revoke access for ${grant.professionalName} (${grant.hospitalName}) to ${grant.recordIds.length} record(s)? This action cannot be undone.`,
            onConfirm: () => handleRevoke(grant.professionalAddress, grant.recordIds),
            confirmText: 'Revoke Access',
            confirmColor: 'bg-red-600'
        });
    };
    // --- END OF MODAL STATE ---


    const fetchGrants = async () => {
        if (!account) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:3001/api/users/access-grants/patient/${account}`);
            if (response.data.success) {
                // Sort by name for consistent ordering
                const sortedGrants = (response.data.data || []).sort((a, b) => a.professionalName.localeCompare(b.professionalName));
                setGrants(sortedGrants);
            }
        } catch (error) {
            console.error("Failed to fetch access grants:", error);
            toast.error("Could not fetch your active grants.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (account) fetchGrants();
    }, [account]);

    const handleRevoke = async (professionalAddress, recordIds) => {
        // This function is now called by the modal's onConfirm
        if (!contract) {
            toast.error("Blockchain contract not available.");
            return;
        }
        setIsRevoking(professionalAddress); // Set loading state for the button
        const toastId = toast.loading("Preparing revocation transaction...");
        try {
            const tx = await contract.revokeMultipleRecordAccess(professionalAddress, recordIds);
            toast.loading("Broadcasting transaction...", { id: toastId });
            await tx.wait();
            toast.success("Access successfully revoked! The list will update shortly.", { id: toastId });
            setTimeout(fetchGrants, 4000);
        } catch (error) {
            console.error("Revocation failed:", error);
            toast.error(error?.data?.message || "Revocation transaction failed.", { id: toastId });
        } finally {
            setIsRevoking(null); // Clear loading state
            closeModal(); // Close modal on completion
        }
    };

    // --- UI REDESIGN ---
    return (
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Access Management</h2>
                    <p className="text-slate-500 mt-1">Review and manage active permissions for your shared records.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-4">Professional</th>
                                <th scope="col" className="px-6 py-4">Hospital / Clinic</th>
                                <th scope="col" className="px-6 py-4 text-center">Records Shared</th>
                                <th scope="col" className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                // --- NEW: Render skeleton rows during loading ---
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan="4" className="px-6 py-4">
                                            <div className="flex items-center gap-4 animate-pulse">
                                                <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                                                    <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : grants.length === 0 ? (
                                // --- NEW: Redesigned empty state ---
                                <tr>
                                    <td colSpan="4" className="text-center p-12">
                                        <UserGroupIcon />
                                        <p className="font-semibold text-slate-600 mt-4">No Active Permissions</p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            You haven't shared your records with any professionals yet.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                // --- NEW: Map grants to table rows ---
                                grants.map((grant) => (
                                    <tr key={grant.professionalAddress} className="bg-white border-b hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">{grant.professionalName}</div>
                                            <div className="font-mono text-xs text-slate-400 mt-1">{grant.professionalAddress}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {grant.hospitalName}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-2 py-1 text-xs font-semibold text-teal-800 bg-teal-100 rounded-full">
                                                {grant.recordIds.length} Record(s)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => openConfirm(grant)} // <-- 3. MODIFY ONCLICK
                                                disabled={isRevoking === grant.professionalAddress}
                                                className="flex items-center justify-center w-full max-w-[120px] mx-auto px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                                            >
                                                {isRevoking === grant.professionalAddress ? <SpinnerWhite /> : <RevokeIcon />}
                                                {isRevoking === grant.professionalAddress ? 'Revoking' : 'Revoke'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

             {/* --- 4. RENDER THE MODAL --- */}
             <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
                confirmText={modalState.confirmText}
                confirmColor={modalState.confirmColor}
                isLoading={isRevoking !== null} // Tie loading to existing state
            />
        </div>
    );
}
