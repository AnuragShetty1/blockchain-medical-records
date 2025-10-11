"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import { unwrapSymmetricKey } from '@/utils/crypto';

// --- ICONS ---
const DocumentIcon = () => <svg className="w-8 h-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const DecryptIcon = () => <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>;


export default function DoctorRecordList({ records, onRecordViewed }) {
    const { keyPair } = useWeb3();
    const [decryptingId, setDecryptingId] = useState(null);

    const handleViewRecord = async (record) => {
        if (!keyPair || !keyPair.privateKey) {
            toast.error("Your security keys are not loaded. Please try refreshing.");
            return;
        }
        if (!record.encryptedDataCID) {
            toast.error("Cannot decrypt: Encrypted file location is missing.");
            return;
        }
        if (!record.encryptedDekForViewer) {
            toast.error("Cannot decrypt: Secure decryption key for this record is missing.");
            return;
        }

        setDecryptingId(record.id);
        const toastId = toast.loading("Fetching encrypted file from IPFS...");

        try {
            // 1. Fetch the main encrypted data bundle from IPFS
            const response = await fetch(`https://ipfs.io/ipfs/${record.encryptedDataCID}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch file from IPFS: ${response.statusText}`);
            }
            const encryptedBundle = await response.json();
            
            toast.loading("Unwrapping secure key...", { id: toastId });

            // 2. Unwrap the symmetric key using the re-wrapped key from the event
            const symmetricKey = await unwrapSymmetricKey(
                record.encryptedDekForViewer,
                encryptedBundle.iv,
                keyPair.privateKey
            );

            toast.loading("Decrypting file in your browser...", { id: toastId });

            // 3. Decrypt the actual data using the successfully unwrapped symmetric key
            const decryptedData = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(encryptedBundle.iv) },
                symmetricKey,
                new Uint8Array(encryptedBundle.encryptedData)
            );

            // 4. Create a Blob and open it in a new tab for viewing
            const blob = new Blob([decryptedData], { type: record.metadata.fileType || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            // The browser will revoke the object URL automatically when the tab is closed.
            
            toast.success("Record decrypted and opened!", { id: toastId });

            if (onRecordViewed) {
                onRecordViewed(record.id);
            }

        } catch (error) {
            console.error("Decryption failed:", error);
            toast.error(error.message || "Could not decrypt the record. You may not have the correct permissions, or the data may be corrupt.", { id: toastId });
        } finally {
            setDecryptingId(null);
        }
    };

    if (!records || records.length === 0) {
        return (
            <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-700">No Records Found</h3>
                <p className="mt-1">No patients have shared records with you yet.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 mt-8">
            <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Shared Patient Records</h3>
                <p className="text-slate-500 mt-1">Showing all records you have been granted access to.</p>
            </div>
            <div className="divide-y divide-slate-200">
                {records.map((record) => (
                    <div key={record.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <DocumentIcon />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-md text-slate-800 truncate" title={record.metadata?.description}>
                                    {record.metadata?.description || "No description available"}
                                </p>
                                <p className="text-sm text-slate-500 mt-1 truncate" title={record.metadata?.fileName}>
                                    File: {record.metadata?.fileName || "Unknown"}
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                    Shared by: <span className="font-medium text-slate-600">{record.ownerName}</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                     Access Expires: {record.accessUntil > (Date.now() / 1000) ? format(new Date(record.accessUntil * 1000), "PPpp") : 'Expired'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleViewRecord(record)}
                            disabled={decryptingId === record.id}
                            className="mt-4 sm:mt-0 sm:ml-4 w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        >
                            {decryptingId === record.id ? <Spinner /> : <DecryptIcon />}
                            {decryptingId === record.id ? 'Decrypting...' : 'View & Decrypt'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

