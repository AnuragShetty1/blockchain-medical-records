"use client";

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { hybridDecrypt } from '@/utils/crypto';

// --- CONFIGURATION ---
const CONCURRENT_FETCH_LIMIT = 3; // A safe limit for public gateways
// DEFINITIVE FIX: Switched to a more tolerant public IPFS gateway to avoid 429 errors.
const IPFS_GATEWAY = 'https://ipfs.io'; 

// --- SVG Icons (Unchanged) ---
const ViewIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ShareIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.186 2.25 2.25 0 00-3.933 2.186z" /></svg>;
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-500"></div>;

// Helper to get category styles
const getCategoryStyle = (category) => {
    switch (category) {
        case 'lab-result': return { icon: '🔬', color: 'bg-blue-100 text-blue-800' };
        case 'prescription': return { icon: '💊', color: 'bg-green-100 text-green-800' };
        case 'doctor-note': return { icon: '📝', color: 'bg-yellow-100 text-yellow-800' };
        case 'insurance-claim': return { icon: '📄', color: 'bg-indigo-100 text-indigo-800' };
        default: return { icon: '📁', color: 'bg-slate-100 text-slate-800' };
    }
};

export default function RecordList() {
    const { account, records: patientRecords, keyPair, isLoadingProfile } = useWeb3();
    const [recordsWithMetadata, setRecordsWithMetadata] = useState([]);
    const [isFetchingMetadata, setIsFetchingMetadata] = useState(true);
    const [decryptionStates, setDecryptionStates] = useState({});

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const processQueue = async (items, asyncProcess, onProgress) => {
             let activePromises = 0;
            const queue = [...items];

            return new Promise((resolve, reject) => {
                const processNext = () => {
                    if (queue.length === 0 && activePromises === 0) {
                        resolve();
                        return;
                    }
                    while (activePromises < CONCURRENT_FETCH_LIMIT && queue.length > 0) {
                        activePromises++;
                        const item = queue.shift();
                        asyncProcess(item)
                            .then(result => {
                                if (!signal.aborted && result) {
                                    onProgress(result);
                                }
                            })
                            .catch(error => {
                                if (error.name !== 'AbortError') {
                                    console.error("Error in queue processing:", error);
                                }
                            })
                            .finally(() => {
                                activePromises--;
                                processNext();
                            });
                    }
                };
                processNext();
            });
        };
        
        const fetchAndProcessRecord = async (record) => {
            const recordData = {
                id: Number(record[0]),
                metadataIPFSHash: String(record[1]),
                timestamp: Number(record[2]),
                patient: record[3],
                uploadedBy: record[4],
                isVerified: record[5],
                category: record[6],
            };
            
            const metadataUrl = `${IPFS_GATEWAY}/ipfs/${recordData.metadataIPFSHash}`;
            console.log(`[DEBUG] Attempting to fetch metadata for record ID: ${recordData.id} from ${metadataUrl}`);

            try {
                const response = await fetch(metadataUrl, { signal });
                if (!response.ok) {
                    throw new Error(`Gateway returned HTTP ${response.status}`);
                }
                const metadata = await response.json();
                console.log(`[DEBUG] SUCCESS: Fetched and parsed metadata for record ID: ${recordData.id}`, metadata);
                return { ...recordData, metadata };
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(`[DEBUG] FAILED to fetch or parse metadata for record ID: ${recordData.id}. URL: ${metadataUrl}`, error);
                    return { ...recordData, metadata: { description: "Error: Could not load metadata.", fileName: "Unknown" } };
                }
                return null;
            }
        };

        const fetchAllMetadata = async () => {
            if (isLoadingProfile || !patientRecords) return;
            
            console.log("[DEBUG] Starting metadata fetch process...");
            setIsFetchingMetadata(true);
            setRecordsWithMetadata([]);

            const validPatientRecords = patientRecords.filter(r => r && r[1] && typeof r[1] === 'string' && r[1].length > 0);
            console.log(`[DEBUG] Found ${validPatientRecords.length} valid records to process.`);


            if (validPatientRecords.length === 0) {
                if (!signal.aborted) setIsFetchingMetadata(false);
                return;
            }

            const handleProgress = (newlyFetchedRecord) => {
                setRecordsWithMetadata(prev => {
                    if (prev.some(r => r.id === newlyFetchedRecord.id)) {
                        return prev;
                    }
                    return [...prev, newlyFetchedRecord].sort((a, b) => b.timestamp - a.timestamp);
                });
            };

            await processQueue(validPatientRecords, fetchAndProcessRecord, handleProgress);
            
            if (!signal.aborted) {
                console.log("[DEBUG] Metadata fetch process complete.");
                setIsFetchingMetadata(false);
            } else {
                console.log("[DEBUG] Metadata fetch process was aborted.");
            }
        };

        fetchAllMetadata();

        return () => {
            controller.abort();
        };
    }, [isLoadingProfile, patientRecords]);

    const handleDecryptAndView = async (record, index) => {
        if (!keyPair?.privateKey) {
            toast.error("Private key not available. Cannot decrypt.");
            return;
        }
        setDecryptionStates(prev => ({ ...prev, [index]: 'pending' }));
        const toastId = toast.loading("Fetching encrypted data bundle...");
        try {
            const bundleHash = record.metadata.encryptedBundleIPFSHash;
            if (!bundleHash) throw new Error("Invalid metadata: Bundle hash missing.");
            
            const bundleUrl = `${IPFS_GATEWAY}/ipfs/${bundleHash}`;
            const response = await fetch(bundleUrl);
            if (!response.ok) throw new Error("Could not fetch encrypted bundle from IPFS.");
            const encryptedBundle = await response.json();

            toast.loading("Decrypting file in browser...", { id: toastId });
            const decryptedData = await hybridDecrypt(encryptedBundle, keyPair.privateKey);

            const blob = new Blob([decryptedData], { type: record.metadata.fileType });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            window.URL.revokeObjectURL(url);
            toast.success("File decrypted successfully!", { id: toastId });
            setDecryptionStates(prev => ({ ...prev, [index]: 'success' }));
        } catch (error) {
            console.error("Decryption failed:", error);
            toast.error(error.message || "An error occurred during decryption.", { id: toastId });
            setDecryptionStates(prev => ({ ...prev, [index]: 'error' }));
        }
    };

    if (isLoadingProfile || (isFetchingMetadata && recordsWithMetadata.length === 0)) {
        return (
            <div className="flex justify-center items-center p-12 bg-slate-50 rounded-lg">
                <Spinner />
                <p className="ml-4 text-slate-500">Loading your records...</p>
            </div>
        );
    }

    if (!isFetchingMetadata && (!recordsWithMetadata || recordsWithMetadata.length === 0)) {
        return <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">You have not uploaded any medical records yet.</div>;
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-md border border-slate-200">
            <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Your Medical Records</h3>
                <p className="text-slate-500 mt-1">These records are encrypted and securely stored on IPFS.</p>
            </div>
            <div className="divide-y divide-slate-200">
                {recordsWithMetadata.map((record, index) => {
                    const isSelfUploaded = record.uploadedBy && account ? record.uploadedBy.toLowerCase() === account.toLowerCase() : false;
                    const categoryStyle = getCategoryStyle(record.metadata?.category);
                    
                    return (
                        <div key={record.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${categoryStyle.color}`}>
                                    {categoryStyle.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <p className="font-semibold text-md text-slate-800 truncate" title={record.metadata?.description}>
                                            {record.metadata?.description || "No description provided"}
                                        </p>
                                        {record.uploadedBy && (
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${record.isVerified ? 'bg-green-100 text-green-800' : (isSelfUploaded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800')}`}>
                                                {record.isVerified ? "Verified" : (isSelfUploaded ? "Self-Uploaded" : "Uploaded by Other")}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1 truncate" title={record.metadata?.fileName}>
                                        File: {record.metadata?.fileName || "Unknown"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Uploaded: {record.timestamp ? format(new Date(record.timestamp * 1000), "PPpp") : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 md:mt-0 md:ml-4 flex-shrink-0">
                                <button
                                    onClick={() => {/* TODO: Implement sharing */}}
                                    disabled={true}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    <ShareIcon />
                                    Share
                                </button>
                                <button
                                    onClick={() => handleDecryptAndView(record, index)}
                                    disabled={decryptionStates[index] === 'pending' || !keyPair}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow"
                                >
                                    {decryptionStates[index] === 'pending' ? <SpinnerIcon /> : <ViewIcon />}
                                    {decryptionStates[index] === 'pending' ? 'Processing...' : 'Decrypt & View'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

