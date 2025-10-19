"use client";

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import axios from 'axios';
import toast from 'react-hot-toast';

// --- ICONS ---
const RevokeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500"></div>;
const SpinnerWhite = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>;


export default function AccessManagement() {
    const { account, contract } = useWeb3(); // Get contract from context
    const [grants, setGrants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRevoking, setIsRevoking] = useState(null); // Track which grant is being revoked

    const fetchGrants = async () => {
        if (!account) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:3001/api/users/access-grants/patient/${account}`);
            if (response.data.success) {
                setGrants(response.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch access grants:", error);
            toast.error("Could not fetch your active grants.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGrants();
    }, [account]);

    const handleRevoke = async (professionalAddress, recordIds) => {
        if (!contract) {
            toast.error("Blockchain contract not available.");
            return;
        }
        setIsRevoking(professionalAddress);
        const toastId = toast.loading("Preparing revocation transaction...");
        try {
            const tx = await contract.revokeMultipleRecordAccess(professionalAddress, recordIds);
            toast.loading("Broadcasting transaction...", { id: toastId });
            await tx.wait();
            toast.success("Access successfully revoked! The list will update shortly.", { id: toastId });
            setTimeout(fetchGrants, 4000); // Give indexer time to process the event
        } catch (error) {
            console.error("Revocation failed:", error);
            toast.error(error?.data?.message || "Revocation transaction failed.", { id: toastId });
        } finally {
            setIsRevoking(null);
        }
    };

    return (
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-slate-200">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Access Management</h2>
                    <p className="text-slate-500 mt-1">Review and revoke access to your shared medical records.</p>
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-700 mb-4">Current Permissions</h3>
            {isLoading ? (
                <div className="flex justify-center items-center h-48"><Spinner /></div>
            ) : grants.length === 0 ? (
                <p className="text-center text-slate-500 bg-slate-50 p-8 rounded-lg">You have not granted access to any professionals yet.</p>
            ) : (
                <div className="space-y-4">
                    {grants.map((grant) => (
                        <div key={grant.professionalAddress} className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div className="flex-1">
                                <p className="font-bold text-slate-800">{grant.professionalName}</p>
                                <p className="text-sm text-slate-600">{grant.hospitalName}</p>
                                <p className="text-xs text-slate-400 font-mono mt-1">{grant.professionalAddress}</p>
                                <p className="text-sm text-slate-500 mt-2">
                                    Access to <span className="font-semibold text-slate-700">{grant.recordIds.length}</span> record(s)
                                </p>
                            </div>
                            <button
                                onClick={() => handleRevoke(grant.professionalAddress, grant.recordIds)}
                                disabled={isRevoking === grant.professionalAddress}
                                className="mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:bg-slate-400"
                            >
                                {isRevoking === grant.professionalAddress ? <SpinnerWhite /> : <RevokeIcon />}
                                {isRevoking === grant.professionalAddress ? 'Revoking...' : 'Revoke Access'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
