"use client";
import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { rewrapSymmetricKey } from '@/utils/crypto';
import { fetchFromIPFS } from '@/utils/ipfs'; // --- MODIFICATION: Import the resilient IPFS fetch utility ---
import ConfirmationModal from './ConfirmationModal'; // <-- 1. IMPORT MODAL

// --- ICONS ---
const ShareIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.186 2.25 2.25 0 00-3.933 2.186z" /></svg>;
const CloseIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const SpinnerWhite = () => <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>;


export default function AccessManager({
    isOpen,
    onClose,
    onGrantSuccess,
    records: initialRecords,
    preselectedRecords,
    preselectedProfessional
}) {
    const { contract, keyPair, api } = useWeb3();

    // FIX: The component now correctly uses the preselected professional's address and disables the input for the approval flow.
    const [granteeAddress, setGranteeAddress] = useState(preselectedProfessional?.address || '');
    const [duration, setDuration] = useState('30');
    const [customDuration, setCustomDuration] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // FIX: The component was crashing because the 'records' prop was undefined in the approval flow.
    // This line ensures `records` is always a valid array, prioritizing `preselectedRecords` when available.
    const records = preselectedRecords || initialRecords || [];

    const isBulkShare = records.length > 1;
    const finalDuration = duration === 'custom' ? Number(customDuration) : Number(duration);

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
        if (isLoading) return; // Use existing loading state
        setModalState({ ...modalState, isOpen: false });
    };

    // Function to open the modal for grant action
    const openConfirm = () => {
        // Perform initial validation *before* showing the modal
         if (!ethers.isAddress(granteeAddress)) {
            toast.error("Please enter a valid Ethereum wallet address.");
            return;
        }
         if (!records || records.length === 0 || !contract || !keyPair || !api) {
            toast.error("Required context (records, contract, api, or key pair) is missing. Please reconnect wallet and try again.");
            return;
        }
        if (duration === 'custom' && (!customDuration || Number(customDuration) <= 0)) {
            toast.error("Please enter a valid number of days for the custom duration.");
            return;
        }

        // Get professional name if available (for better message)
        const professionalName = preselectedProfessional?.name || granteeAddress;

        setModalState({
            isOpen: true,
            title: 'Confirm Access Grant',
            message: `Are you sure you want to grant access to ${records.length} record(s) for ${professionalName} for ${finalDuration} days?`,
            onConfirm: confirmGrantAccess, // Set the actual grant function as the confirm action
            confirmText: 'Grant Access',
            confirmColor: 'bg-teal-600'
        });
    };
    // --- END OF MODAL STATE ---


    // --- 3. RENAMED ORIGINAL FUNCTION & MOVED LOGIC ---
    // This function now contains the core logic previously in handleGrantAccess
    const confirmGrantAccess = async () => {
        // No need for validation here, it was done in openConfirm

        setIsLoading(true);
        const toastId = toast.loading("Verifying professional and checking permissions...");

        try {
            const professional = await contract.users(granteeAddress);
            if (professional.walletAddress === ethers.ZeroAddress || !professional.isVerified) {
                throw new Error("This address does not belong to a verified professional.");
            }
            if (Number(professional.role) === 0) {
                throw new Error("Cannot grant access to a patient.");
            }
            if (!professional.publicKey) {
                throw new Error("This professional has not set up their encryption key.");
            }

            toast.loading("Fetching encrypted data and preparing secure keys...", { id: toastId });

            const professionalPublicKey = professional.publicKey;
            const recordIdsToGrant = records.map(r => r.recordId);

            const encryptedDeks = await Promise.all(
                records.map(async (record) => {
                    const fullRecordData = await contract.records(record.recordId);
                    const ipfsHash = fullRecordData.ipfsHash;

                    if (!ipfsHash) {
                           throw new Error(`Critical error: Cannot find IPFS hash for record ${record.recordId}.`);
                    }

                    // --- MODIFICATION: Use the new utility to fetch metadata ---
                    const response = await fetchFromIPFS(ipfsHash);
                    const metadata = await response.json();
                    const bundleHash = metadata.encryptedBundleIPFSHash;

                    // --- MODIFICATION: Use the new utility to fetch the encrypted bundle ---
                    const bundleResponse = await fetchFromIPFS(bundleHash);
                    const encryptedBundle = await bundleResponse.json();

                    const rewrappedDek = await rewrapSymmetricKey(
                        encryptedBundle,
                        keyPair.privateKey,
                        professionalPublicKey
                    );
                    return rewrappedDek;
                })
            );

            toast.loading("Sending sponsored transaction to the backend...", { id: toastId });
            
            if (isBulkShare) {
                await api.grantMultipleRecordAccess(granteeAddress, recordIdsToGrant, finalDuration, encryptedDeks);
            } else {
                await api.grantRecordAccess(granteeAddress, recordIdsToGrant[0], finalDuration, encryptedDeks[0]);
            }

            toast.success(`Access granted successfully for ${finalDuration} days!`, { id: toastId });

            // FIX: Call the correct success handler depending on the flow.
            if (onGrantSuccess) {
                onGrantSuccess();
            } else {
                onClose(); // Call original onClose if no specific success handler
            }
            closeModal(); // Close the confirmation modal

        } catch (error) {
            console.error("Failed to grant access:", error);
            let errorMessage = "An unexpected error occurred.";
              if (error.reason) { // Ethers v6 contract revert reason
                errorMessage = error.reason;
            } else if (error.message) {
                errorMessage = error.message;
            }
            toast.error(errorMessage, { id: toastId });
            // Don't close modal on error, let user try again or cancel
        } finally {
            setIsLoading(false);
            // Don't close modal here in finally, only on success or explicit cancel
        }
    };

    // --- 4. MODIFY FORM SUBMISSION HANDLER ---
    // This now only calls openConfirm to show the modal
    const handleGrantAccessSubmit = async (e) => {
         e.preventDefault();
         openConfirm(); // Open the confirmation modal instead of running logic directly
     };


    // The component is rendered by the parent, so we check the `isOpen` prop.
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"> {/* Removed backdrop-blur-sm */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                <button
                    onClick={onClose} // Use original onClose prop for manual closing
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors"
                    aria-label="Close"
                     disabled={isLoading} // Prevent closing while processing
                >
                    <CloseIcon />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-teal-100 p-3 rounded-full">
                        <ShareIcon className="text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{isBulkShare ? `Share ${records.length} Records` : 'Share Record'}</h2>
                        {!isBulkShare && records && records.length > 0 && (
                            <p className="text-slate-500 truncate" title={records[0].title}>
                                Sharing: "{records[0].title || `Record ID: ${records[0].recordId}`}"
                            </p>
                        )}
                    </div>
                </div>

                {/* --- 5. POINT FORM ONSUBMIT TO THE NEW HANDLER --- */}
                <form onSubmit={handleGrantAccessSubmit} className="space-y-6">
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
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition disabled:bg-slate-100"
                            required
                            disabled={!!preselectedProfessional || isLoading} // Disable while loading
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
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-white disabled:bg-slate-100"
                                 disabled={isLoading} // Disable while loading
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
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100"
                                    required
                                     disabled={isLoading} // Disable while loading
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
                             {/* Keep button text simple, modal handles confirmation text */}
                             Grant Access
                        </button>
                    </div>
                </form>
            </div>

             {/* --- 6. RENDER THE CONFIRMATION MODAL --- */}
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
                confirmText={modalState.confirmText}
                confirmColor={modalState.confirmColor}
                isLoading={isLoading} // Tie loading to existing state
            />
        </div>
    );
}
