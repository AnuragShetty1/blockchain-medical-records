"use client";

import { useState, useEffect, useMemo } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { hybridDecrypt } from '@/utils/crypto';
import axios from 'axios';
import ShareRecordsModal from './ShareRecordsModal';
import { fetchFromIPFS } from '@/utils/ipfs'; // --- MODIFICATION: Import the resilient IPFS fetch utility ---

// --- ICONS ---
const ViewIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500"></div>;
const ShareIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 4.186m0-4.186c.105.022.213.04.324.058m-3.248 4.07c.11-.018.218-.036.324-.058m3.248-4.07a2.25 2.25 0 014.186 0m-4.186 0c.213.04.425.083.638.125m-6.38 3.82c.213-.042.425-.083.638-.125m3.248 4.07c.11-.018.218-.036.324-.058m-3.248-4.07c.105.022.213.04.324.058m0 0c1.282.23 2.52.23 3.802 0m0 0a2.25 2.25 0 014.186 0m-4.186 0c.213.04.425.083.638.125m-6.38 3.82c.213-.042.425-.083.638-.125m3.248 4.07c.11-.018.218-.036.324-.058m-3.248-4.07c.105.022.213.04.324.058" /></svg>;


// --- CONFIGURATION ---
const CATEGORIES = [
    { id: 'all', name: 'All Categories', icon: '🗂️' },
    { id: 'lab-result', name: 'Lab Results', icon: '🔬' },
    { id: 'prescription', name: 'Prescriptions', icon: '💊' },
    { id: 'doctor-note', name: 'Doctor Notes', icon: '📝' },
    { id: 'insurance-claim', name: 'Insurance', icon: '📄' },
    { id: 'other', name: 'Other', icon: '📁' },
];

const getCategoryStyle = (category) => {
    switch (category) {
        case 'lab-result': return { color: 'bg-blue-100 text-blue-800' };
        case 'prescription': return { color: 'bg-green-100 text-green-800' };
        case 'doctor-note': return { color: 'bg-yellow-100 text-yellow-800' };
        case 'insurance-claim': return { color: 'bg-indigo-100 text-indigo-800' };
        default: return { color: 'bg-slate-100 text-slate-800' };
    }
};

const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export default function RecordList({ searchQuery }) {
    const { account, keyPair } = useWeb3();
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [decryptionStates, setDecryptionStates] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    // --- NEW: State for sharing functionality ---
    const [selectedRecordsForSharing, setSelectedRecordsForSharing] = useState([]);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Effect for initial load and search
    useEffect(() => {
        const fetchRecords = async (showLoader = true) => {
            if (!account) return;
            if (showLoader) setIsLoading(true);
            try {
                const params = { q: searchQuery || '' };
                const response = await axios.get(`http://localhost:3001/api/users/records/patient/${account}`, { params });
                setRecords(response.data.success ? response.data.data || [] : []);
            } catch (error) {
                console.error("Failed to fetch records:", error);
                toast.error("Could not get records.");
            } finally {
                if (showLoader) setIsLoading(false);
            }
        };

        const debounceFetch = setTimeout(() => fetchRecords(true), 300);
        return () => clearTimeout(debounceFetch);
    }, [account, searchQuery]);

    // Effect for background polling
    useEffect(() => {
        const pollRecords = async () => {
            if (!account) return;
            try {
                const params = { q: searchQuery || '' };
                const response = await axios.get(`http://localhost:3001/api/users/records/patient/${account}`, { params });
                if (response.data.success) {
                    setRecords(response.data.data || []);
                }
            } catch (error) {
                console.error("Background poll failed:", error);
            }
        };
        const intervalId = setInterval(pollRecords, 10000);
        return () => clearInterval(intervalId);
    }, [account, searchQuery]);
    
    const filteredRecords = useMemo(() => {
        if (selectedCategory === 'all') {
            return records;
        }
        return records.filter(record => record.category === selectedCategory);
    }, [records, selectedCategory]);

    // --- NEW: Handler for selecting records to share ---
    const handleRecordSelectToggle = (recordId) => {
        setSelectedRecordsForSharing(prevSelected => {
            if (prevSelected.includes(recordId)) {
                return prevSelected.filter(id => id !== recordId);
            } else {
                return [...prevSelected, recordId];
            }
        });
    };

    const handleDecryptAndView = async (record) => {
        if (!keyPair?.privateKey) {
            toast.error("Your security key is not available. Cannot decrypt.");
            return;
        }

        setDecryptionStates(prev => ({ ...prev, [record.recordId]: 'pending' }));
        const toastId = toast.loading("Fetching encrypted data...");

        try {
            // --- MODIFICATION: Use the new utility to fetch metadata ---
            const metaResponse = await fetchFromIPFS(record.ipfsHash);
            const metadata = await metaResponse.json();

            const bundleHash = metadata.encryptedBundleIPFSHash;
            if (!bundleHash) throw new Error("Invalid metadata: Encrypted file hash is missing.");
            
            // --- MODIFICATION: Use the new utility to fetch the encrypted bundle ---
            const bundleResponse = await fetchFromIPFS(bundleHash);
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

    return (
        <div>
            <div className="mb-6 pb-4 border-b border-slate-200">
                <label htmlFor="category-filter" className="block text-sm font-medium text-slate-700 mb-1">
                    Filter by Category
                </label>
                <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white transition"
                >
                    {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* --- NEW: Share Button and control section --- */}
            <div className="my-6">
                 <button
                    onClick={() => setIsShareModalOpen(true)}
                    disabled={selectedRecordsForSharing.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <ShareIcon />
                    Share Selected ({selectedRecordsForSharing.length})
                </button>
            </div>

            {filteredRecords.length === 0 ? (
                <div className="text-center p-12 bg-slate-50 rounded-lg">
                    <p className="font-semibold text-slate-600">No records found.</p>
                    <p className="text-sm text-slate-500 mt-2">
                        {searchQuery ? "Try adjusting your search or category." : "Upload a record to get started."}
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl shadow-sm">
                    {filteredRecords.map((record) => (
                        <div key={record.recordId} className="flex items-start justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                {/* --- NEW: Checkbox for selection --- */}
                                <div className="flex-shrink-0 pt-1">
                                     <input
                                        type="checkbox"
                                        id={`record-select-${record.recordId}`}
                                        checked={selectedRecordsForSharing.includes(record.recordId)}
                                        onChange={() => handleRecordSelectToggle(record.recordId)}
                                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                                
                                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${getCategoryStyle(record.category).color}`}>
                                    {CATEGORIES.find(c => c.id === record.category)?.icon || '📁'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-md text-slate-800 truncate" title={record.title}>
                                        {record.title}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {format(new Date(record.timestamp), "PPpp")}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {record.isVerified ? (
                                            <span className="px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs font-semibold text-sky-800 bg-sky-100 rounded-full">
                                                Self Uploaded
                                            </span>
                                        )}
                                        <p className="text-xs text-slate-400 font-mono" title={record.uploadedBy}>
                                            by {truncateAddress(record.uploadedBy)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4 flex-shrink-0 mt-1">
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
            )}

            {/* --- FIX: Pass the 'records' state to the modal --- */}
            {isShareModalOpen && (
                <ShareRecordsModal
                    records={records}
                    recordsToShare={selectedRecordsForSharing}
                    onClose={() => {
                        setIsShareModalOpen(false);
                        setSelectedRecordsForSharing([]); // Clear selection on close
                    }}
                />
            )}
        </div>
    );
}
