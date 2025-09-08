"use client";

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getEncryptionKey, decryptFile, base64ToUint8Array } from '@/utils/crypto';

// --- SVG Icons ---
const DownloadIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-500"></div>;


export default function RecordList() {
    // --- USE THE SIGNER FROM CONTEXT ---
    const { signer, contract, account, records: patientRecords } = useWeb3(); // Get records from context
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [decryptionStates, setDecryptionStates] = useState({});

    useEffect(() => {
        const fetchRecordsAndMetadata = async () => {
            if (contract && account && patientRecords) {
                try {
                    setIsLoading(true);
                    const recordsWithMetadata = await Promise.all(
                        patientRecords.map(async (record) => {
                            try {
                                const metadataUrl = `https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`;
                                const response = await fetch(metadataUrl);
                                if (!response.ok) {
                                    return { ipfsHash: record.ipfsHash, timestamp: Number(record.timestamp), description: "Could not load metadata.", fileName: "Unknown" };
                                }
                                const metadata = await response.json();
                                return {
                                    ipfsHash: record.ipfsHash,
                                    timestamp: Number(record.timestamp),
                                    description: metadata.description || "No description.",
                                    fileName: metadata.content?.[0]?.attachment?.title || "Unnamed",
                                };
                            } catch (error) {
                                return { ipfsHash: record.ipfsHash, timestamp: Number(record.timestamp), description: "Error reading metadata.", fileName: "Unknown" };
                            }
                        })
                    );
                    setRecords(recordsWithMetadata);
                } catch (error) {
                    console.error("Failed to fetch records:", error);
                    toast.error("Could not fetch your medical records.");
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchRecordsAndMetadata();
    }, [contract, account, patientRecords]);

    const handleDecryptAndDownload = async (metadataHash, index) => {
        setDecryptionStates(prev => ({ ...prev, [index]: 'pending' }));
        const toastId = toast.loading("Waiting for signature to generate decryption key...");

        try {
            // --- UPDATED CHECK ---
            if (!signer) throw new Error("Wallet not connected or signer not available.");

            // 1. Generate the decryption key from the signer in context
            const decryptionKey = await getEncryptionKey(signer);

            // 2. Fetch the metadata JSON from IPFS
            toast.loading("Fetching record metadata...", { id: toastId });
            const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
            const metadataResponse = await fetch(metadataUrl);
            if (!metadataResponse.ok) throw new Error("Could not fetch metadata from IPFS.");
            const metadata = await metadataResponse.json();

            // 3. Extract the encrypted file's URL and the IV
            const encryptedFileUrl = metadata.content?.[0]?.attachment?.url;
            const ivBase64 = metadata.content?.[0]?.attachment?.data;
            const fileName = metadata.content?.[0]?.attachment?.title || 'decrypted-file';

            if (!encryptedFileUrl || !ivBase64) {
                throw new Error("Invalid or corrupted record metadata.");
            }

            // 4. Fetch the encrypted file from IPFS
            toast.loading("Fetching encrypted file...", { id: toastId });
            const ipfsUrl = encryptedFileUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            const encryptedResponse = await fetch(ipfsUrl);
            if (!encryptedResponse.ok) throw new Error("Could not fetch encrypted file from IPFS.");
            const encryptedData = await encryptedResponse.arrayBuffer();

            // 5. Decrypt the file in the browser
            toast.loading("Decrypting file...", { id: toastId });
            const iv = base64ToUint8Array(ivBase64);
            const decryptedData = await decryptFile(encryptedData, decryptionKey, iv);

            // 6. Trigger download
            const blob = new Blob([decryptedData], { type: metadata.content[0].attachment.contentType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success("File decrypted and downloaded!", { id: toastId });
            setDecryptionStates(prev => ({ ...prev, [index]: 'success' }));

        } catch (error) {
            console.error("Decryption failed:", error);
            toast.error(error.message || "An error occurred during decryption.", { id: toastId });
            setDecryptionStates(prev => ({ ...prev, [index]: 'error' }));
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-12 bg-slate-50 rounded-lg">
                <Spinner />
                <p className="ml-4 text-slate-500">Loading your records from the blockchain...</p>
            </div>
        );
    }

    if (records.length === 0) {
        return <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">You have not uploaded any medical records yet.</div>;
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-md border border-slate-200">
            <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Your Medical Records</h3>
                <p className="text-slate-500 mt-1">These records are encrypted and securely stored on IPFS.</p>
            </div>
            <div className="divide-y divide-slate-200">
                {records.map((record, index) => (
                    <div key={record.ipfsHash} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-md text-slate-800 truncate" title={record.description}>
                                {record.description}
                            </p>
                            <p className="text-sm text-slate-500 mt-1 truncate" title={record.fileName}>
                                Original File: {record.fileName}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                Uploaded on: {record.timestamp ? format(new Date(record.timestamp * 1000), "PPpp") : 'N/A'}
                            </p>
                        </div>
                        <button
                            onClick={() => handleDecryptAndDownload(record.ipfsHash, index)}
                            // --- UPDATED DISABLED CHECK ---
                            disabled={decryptionStates[index] === 'pending' || !signer}
                            className="flex items-center gap-2 ml-4 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow"
                        >
                            {decryptionStates[index] === 'pending' ? <SpinnerIcon /> : <DownloadIcon />}
                            {decryptionStates[index] === 'pending' ? 'Processing...' : 'Decrypt & Download'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

