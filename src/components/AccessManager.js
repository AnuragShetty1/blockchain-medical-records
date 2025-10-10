"use client";
import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

// --- ICONS ---
const ShareIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.186 2.25 2.25 0 00-3.933 2.186z" /></svg>;
const CloseIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

export default function AccessManager({ records, onClose }) {
    const { contract } = useWeb3();
    const [granteeAddress, setGranteeAddress] = useState('');
    const [duration, setDuration] = useState(30);
    const [customDuration, setCustomDuration] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isBulkShare = records.length > 1;
    const finalDuration = duration === 'custom' ? Number(customDuration) : duration;

    const handleGrantAccess = async (e) => {
        e.preventDefault();
        if (!ethers.isAddress(granteeAddress)) {
            toast.error("Please enter a valid Ethereum wallet address.");
            return;
        }
        if (!records || records.length === 0 || !contract) {
            toast.error("Record context is missing. Please try again.");
            return;
        }
        if (duration === 'custom' && (!customDuration || Number(customDuration) <= 0)) {
            toast.error("Please enter a valid number of days for the custom duration.");
            return;
        }


        setIsLoading(true);
        const toastId = toast.loading("Preparing to grant access on-chain...");

        try {
            const professional = await contract.users(granteeAddress);
            if (professional.walletAddress === ethers.ZeroAddress || !professional.isVerified) {
                throw new Error("This address does not belong to a verified professional.");
            }
             if(Number(professional.role) === 0) { // Patient
                 throw new Error("Cannot grant access to a patient.");
            }

            toast.loading("Sending transaction to the blockchain...", { id: toastId });
            
            let tx;
            if (isBulkShare) {
                const recordIds = records.map(r => r.id);
                tx = await contract.grantMultipleRecordAccess(recordIds, granteeAddress, finalDuration);
            } else {
                tx = await contract.grantRecordAccess(records[0].id, granteeAddress, finalDuration);
            }
            
            await tx.wait();

            toast.success(`Access granted for ${finalDuration} days!`, { id: toastId });
            onClose();

        } catch (error) {
            console.error("Failed to grant access:", error);
            const errorMessage = error.reason || error.message || "An unexpected error occurred.";
            toast.error(errorMessage, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors"
                    aria-label="Close"
                >
                    <CloseIcon />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-teal-100 p-3 rounded-full">
                        <ShareIcon className="text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{isBulkShare ? `Share ${records.length} Records` : 'Share Record'}</h2>
                        {!isBulkShare && (
                            <p className="text-slate-500 truncate" title={records[0].metadata?.description}>
                                Sharing: "{records[0].metadata?.description || `Record ID: ${records[0].id}`}"
                            </p>
                        )}
                    </div>
                </div>

                <form onSubmit={handleGrantAccess} className="space-y-6">
                    <div>
                        <label htmlFor="granteeAddress" className="block text-sm font-medium text-slate-700 mb-2">
                            Professional's Wallet Address
                        </label>
                        <input
                            id="granteeAddress"
                            type="text"
                            value={granteeAddress}
                            onChange={(e) => setGranteeAddress(e.target.value)}
                            placeholder="Enter wallet address (0x...)"
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-2">
                                Grant Access For
                            </label>
                            <select
                                id="duration"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-white"
                            >
                                <option value={30}>30 Days</option>
                                <option value={90}>90 Days</option>
                                <option value={365}>1 Year</option>
                                <option value="custom">Custom...</option>
                            </select>
                        </div>
                        {duration === 'custom' && (
                            <div className="animate-fade-in">
                                <label htmlFor="customDuration" className="block text-sm font-medium text-slate-700 mb-2">
                                    Custom Days
                                </label>
                                <input
                                    id="customDuration"
                                    type="number"
                                    min="1"
                                    value={customDuration}
                                    onChange={(e) => setCustomDuration(e.target.value)}
                                    placeholder="e.g., 7"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        >
                            {isLoading ? 'Processing...' : 'Grant Access'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

