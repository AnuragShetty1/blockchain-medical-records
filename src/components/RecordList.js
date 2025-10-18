"use client";

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { hybridDecrypt } from '@/utils/crypto';
import axios from 'axios';

// --- ICONS ---
const ViewIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500"></div>;

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

export default function RecordList({ searchQuery }) {
    const { account, keyPair } = useWeb3();
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [decryptionStates, setDecryptionStates] = useState({});

    // --- REVISED FETCH LOGIC WITH POLLING ---

    // This useEffect handles the initial data load and any subsequent searches.
    useEffect(() => {
        const fetchRecords = async (showLoader = true) => {
            if (!account) return;
            if (showLoader) setIsLoading(true);

            try {
                const params = {};
                if (searchQuery) {
                    params.q = searchQuery;
                }
                const response = await axios.get(`http://localhost:3001/api/users/records/patient/${account}`, { params });
                
                if (response.data.success) {
                    setRecords(response.data.data || []);
                } else {
                    toast.error("Could not load your records.");
                    setRecords([]);
                }
            } catch (error) {
                console.error("Failed to fetch records from backend:", error);
                toast.error("Could not connect to the server to get records.");
            } finally {
                if (showLoader) setIsLoading(false);
            }
        };

        // For searches, we use a debounce to prevent spamming the API.
        const debounceFetch = setTimeout(() => {
            fetchRecords(true); // Always show loader for search
        }, 300);

        return () => clearTimeout(debounceFetch);
    }, [account, searchQuery]);

    // This separate useEffect handles the periodic background polling.
    useEffect(() => {
        const pollRecords = async () => {
            if (!account) return;
            
            // This fetch runs in the background and does not trigger the main loading spinner.
            try {
                const params = {};
                if (searchQuery) {
                    params.q = searchQuery;
                }
                const response = await axios.get(`http://localhost:3001/api/users/records/patient/${account}`, { params });
                
                if (response.data.success) {
                    setRecords(response.data.data || []);
                }
            } catch (error) {
                // We typically don't show an error for a failed poll to avoid spamming the user.
                console.error("Background poll failed:", error);
            }
        };

        // Set up the interval to poll every 10 seconds.
        const intervalId = setInterval(pollRecords, 10000);

        // Clean up the interval when the component unmounts.
        return () => clearInterval(intervalId);
    }, [account, searchQuery]); // Rerun if account or search query changes to poll with the right params.

    const handleDecryptAndView = async (record) => {
        if (!keyPair?.privateKey) {
            toast.error("Your security key is not available. Cannot decrypt.");
            return;
        }

        setDecryptionStates(prev => ({ ...prev, [record.recordId]: 'pending' }));
        const toastId = toast.loading("Fetching encrypted data...");

        try {
            const metadataUrl = `https://ipfs.io/ipfs/${record.ipfsHash}`;
            const metaResponse = await fetch(metadataUrl);
            if (!metaResponse.ok) throw new Error('Could not fetch record metadata from IPFS.');
            const metadata = await metaResponse.json();

            const bundleHash = metadata.encryptedBundleIPFSHash;
            if (!bundleHash) throw new Error("Invalid metadata: Encrypted file hash is missing.");
            
            const bundleUrl = `https://ipfs.io/ipfs/${bundleHash}`;
            const bundleResponse = await fetch(bundleUrl);
            if (!bundleResponse.ok) throw new Error("Could not fetch encrypted file from IPFS.");
            const encryptedBundle = await bundleResponse.json();

            toast.loading("Decrypting file...", { id: toastId });
            const decryptedData = await hybridDecrypt(encryptedBundle, keyPair.privateKey);

            const blob = new Blob([decryptedData], { type: metadata.fileType || 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            window.URL.revokeObjectURL(url); 

            toast.success("File decrypted successfully!", { id: toastId });
            setDecryptionStates(prev => ({ ...prev, [record.recordId]: 'success' }));
        } catch (error) {
            console.error("Decryption failed:", error);
            toast.error(error.message, { id: toastId });
            setDecryptionStates(prev => ({ ...prev, [record.recordId]: 'error' }));
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center p-12 bg-slate-50 rounded-lg h-64">
                <Spinner />
                <p className="mt-4 text-slate-500 font-semibold">Loading your records...</p>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="text-center p-12 bg-slate-50 rounded-lg">
                <p className="font-semibold text-slate-600">No records found.</p>
                <p className="text-sm text-slate-500 mt-2">
                    {searchQuery ? "Try adjusting your search." : "Upload a record to get started."}
                </p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl shadow-sm">
            {records.map((record) => (
                <div key={record.recordId} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${getCategoryStyle(record.category).color}`}>
                            {getCategoryStyle(record.category).icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-md text-slate-800 truncate" title={record.title}>
                                {record.title}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                Uploaded on: {format(new Date(record.timestamp), "PPpp")}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                         <button
                            onClick={() => handleDecryptAndView(record)}
                            disabled={decryptionStates[record.recordId] === 'pending' || !keyPair}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-sm"
                        >
                            {decryptionStates[record.recordId] === 'pending' ? <SpinnerIcon /> : <ViewIcon />}
                            View
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

