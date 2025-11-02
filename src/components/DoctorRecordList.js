"use client";

import { useState, useEffect, useMemo } from 'react'; // ADDED useMemo
import { format } from 'date-fns';
import { useWeb3 } from '../context/Web3Context'; // CORRECTED: Relative path
import toast from 'react-hot-toast';
import { unwrapSymmetricKey } from '../utils/crypto'; // CORRECTED: Relative path
import {
    Eye, Loader2, FileText, AlertTriangle,
    // --- (NEW) IMPORTS ---
    TestTube, ClipboardList, Stethoscope, FileShield, FileQuestion, Calendar
} from 'lucide-react';
import { fetchFromIPFS } from '../utils/ipfs'; // CORRECTED: Relative path
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion'; // ADDED motion

// --- (NEW) HELPERS ---
const CATEGORIES_MAP = {
    'all': 'All Categories',
    'lab-result': 'Lab Results',
    'prescription': 'Prescriptions',
    'doctor-note': 'Doctor Notes',
    'insurance-claim': 'Insurance', // Keep for compatibility
    'other': 'Other',
};

// (From Plan) Helper for badge styling
const getCategoryBadgeStyle = (category) => {
    switch (category) {
        case 'lab-result': return 'bg-blue-100 text-blue-800';
        case 'prescription': return 'bg-green-100 text-green-800';
        case 'doctor-note': return 'bg-yellow-100 text-yellow-800';
        case 'insurance-claim': return 'bg-indigo-100 text-indigo-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

// Use the same icons as the patient's list for consistency
const getCategoryStyling = (category) => {
    switch (category) {
        case 'lab-result':
            return { Icon: TestTube, color: "text-blue-600", borderColor: "border-blue-500" };
        case 'prescription':
            return { Icon: ClipboardList, color: "text-green-600", borderColor: "border-green-500" };
        case 'doctor-note':
            return { Icon: Stethoscope, color: "text-yellow-600", borderColor: "border-yellow-500" };
        case 'insurance-claim':
            return { Icon: FileShield, color: "text-indigo-600", borderColor: "border-indigo-500" };
        default:
            return { Icon: FileQuestion, color: "text-gray-500", borderColor: "border-gray-400" };
    }
};

// (From Plan) Animation Variants
const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const cardItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.05,
            type: "spring",
            stiffness: 100
        },
    }),
};
// --- (END HELPERS) ---


// REMOVED: RecordMetadataCell component

export default function DoctorRecordList({ records }) {
    const { keyPair } = useWeb3();
    const [decryptingId, setDecryptingId] = useState(null);
    const [metadataCache, setMetadataCache] = useState({});

    // --- (NEW) STATE FOR FILTERS ---
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState('date-desc');
    // ---

    // --- (NEW) CONSOLIDATED METADATA FETCHER ---
    useEffect(() => {
        const fetchAllMetadata = async () => {
            // Create a list of records that are not in the cache
            const recordsToFetch = records.filter(
                (record) => metadataCache[record.recordId] === undefined
            );

            if (recordsToFetch.length === 0) return;

            // Set all to 'loading' to prevent re-fetching
            setMetadataCache(prev => {
                const newCache = { ...prev };
                for (const record of recordsToFetch) {
                    newCache[record.recordId] = 'loading';
                }
                return newCache;
            });

            // Fetch all metadata in parallel
            await Promise.all(
                recordsToFetch.map(async (record) => {
                    try {
                        const response = await fetchFromIPFS(record.ipfsHash);
                        const data = await response.json();
                        setMetadataCache(prev => ({ ...prev, [record.recordId]: data || null }));
                    } catch (error) {
                        console.error("Failed to fetch metadata:", error);
                        setMetadataCache(prev => ({ ...prev, [record.recordId]: null }));
                    }
                })
            );
        };

        fetchAllMetadata();
        // Run this effect when the list of records changes
    }, [records, metadataCache]);
    // --- (END METADATA FETCHER) ---

    // --- (NEW) MEMO FOR FILTERING/SORTING ---
    const filteredAndSortedRecords = useMemo(() => {
        // First, get records that have valid, loaded metadata
        let processedRecords = records.filter(
            record => metadataCache[record.recordId] && metadataCache[record.recordId] !== 'loading'
        );

        // 1. Filter by Category
        if (filterCategory !== 'all') {
            processedRecords = processedRecords.filter(record =>
                metadataCache[record.recordId]?.category === filterCategory
            );
        }

        // 2. Sort
        processedRecords.sort((a, b) => {
            const metaA = metadataCache[a.recordId];
            const metaB = metadataCache[b.recordId];
            const dateA = new Date(a.createdAt || 0); // Use grant creation date
            const dateB = new Date(b.createdAt || 0);

            switch (sortBy) {
                case 'date-asc':
                    return dateA - dateB;
                case 'category':
                    return (metaA?.category || '').localeCompare(metaB?.category || '');
                case 'date-desc':
                default:
                    return dateB - dateA;
            }
        });

        return processedRecords;
    }, [records, metadataCache, filterCategory, sortBy]);
    // --- (END MEMO) ---

    // --- (UNMODIFIED) handleViewRecord Logic ---
    const handleViewRecord = async (record) => {
        if (!keyPair?.privateKey) return toast.error("Security keys not loaded.");

        const metadata = metadataCache[record.recordId];
        if (!metadata) return toast.error("Record details are still loading.");

        setDecryptingId(record.recordId);
        const toastId = toast.loading("Fetching encrypted file...");
        try {
            const bundleHash = metadata.encryptedBundleIPFSHash;
            if (!bundleHash) throw new Error("Encrypted file hash is missing.");

            const bundleResponse = await fetchFromIPFS(bundleHash);
            const encryptedBundle = await bundleResponse.json();

            toast.loading("Unwrapping secure key...", { id: toastId });

            const symmetricKey = await unwrapSymmetricKey(record.rewrappedKey, encryptedBundle.iv, keyPair.privateKey);

            toast.loading("Decrypting file...", { id: toastId });
            const decryptedData = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(encryptedBundle.iv) },
                symmetricKey,
                new Uint8Array(encryptedBundle.encryptedData)
            );

            const blob = new Blob([decryptedData], { type: metadata.fileType || 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 1000); // Use timeout

            toast.success("Record decrypted!", { id: toastId });
        } catch (error) {
            console.error("Decryption error:", error);
            toast.error(error.message || "Could not decrypt the record.", { id: toastId });
        } finally {
            setDecryptingId(null);
        }
    };
    // --- (END UNMODIFIED LOGIC) ---

    if (!records || records.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500 bg-gray-50">
                <FileText className="h-10 w-10 mx-auto text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-700 mt-2">No Records Found</h3>
                <p className="mt-1">This patient has not shared any records with you.</p>
            </div>
        );
    }

    // --- (NEW) REFACTORED JSX ---
    return (
        <div className="p-4 bg-gray-50/50">
            {/* 1. Control Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-6">
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                    {Object.entries(CATEGORIES_MAP).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                    ))}
                </select>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                    <option value="date-desc">Shared: Newest</option>
                    <option value="date-asc">Shared: Oldest</option>
                    <option value="category">Category</option>
                </select>
            </div>

            {/* 2. Card Grid */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={cardContainerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* 3. Skeletons for loading metadata */}
                {records
                    .filter(r => metadataCache[r.recordId] === undefined || metadataCache[r.recordId] === 'loading')
                    .map(r => <DoctorRecordCardSkeleton key={r.recordId} />)
                }

                {/* 4. Filtered & Sorted Records */}
                {filteredAndSortedRecords.length > 0 ? (
                    filteredAndSortedRecords.map((record, index) => (
                        <DoctorRecordCard
                            key={record.recordId}
                            record={record}
                            metadata={metadataCache[record.recordId]}
                            onView={() => handleViewRecord(record)}
                            isDecrypting={decryptingId === record.recordId}
                            customIndex={index}
                        />
                    ))
                ) : (
                    // This handles the case where filters match 0 items
                    // (but we don't show it if metadata is still loading)
                    records.every(r => metadataCache[r.recordId] && metadataCache[r.recordId] !== 'loading') && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <p className="text-gray-500 text-center py-8">No records match your filters.</p>
                        </div>
                    )
                )}

                {/* 5. Error Cards */}
                {records
                    .filter(r => metadataCache[r.recordId] === null)
                    .map(r => <DoctorRecordCardError key={r.recordId} record={r} />)
                }
            </motion.div>
        </div>
    );
}

// --- (NEW) Card Component ---
const DoctorRecordCard = ({ record, metadata, onView, isDecrypting, customIndex }) => {
    const { Icon, color, borderColor } = getCategoryStyling(metadata.category) || getCategoryStyling('other');

    return (
        <motion.div
            variants={cardItemVariants}
            initial="hidden"
            animate="visible"
            custom={customIndex}
            whileHover={{ scale: 1.03 }}
            className={`flex flex-col justify-between bg-white rounded-2xl shadow-xl border border-gray-100 p-5 ${borderColor} border-t-4 transition-all duration-300`}
        >
            <div>
                {/* Card Header */}
                <div className="flex items-center gap-3">
                    <Icon className={`${color} h-7 w-7 flex-shrink-0`} />
                    <h3 className="text-lg font-bold text-gray-900 break-words">{metadata.title || "Untitled"}</h3>
                </div>

                {/* Card Body: Details */}
                <div className="space-y-3 mt-4">
                    <InfoRow
                        Icon={Calendar}
                        label="Shared On"
                        value={record.createdAt ? format(new Date(record.createdAt), "PP") : "Unknown"}
                    />
                    <div className="flex items-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryBadgeStyle(metadata.category)}`}>
                            {CATEGORIES_MAP[metadata.category] || 'Other'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card Footer: Actions */}
            <div className="flex justify-end gap-2 mt-6">
                <button
                    onClick={onView}
                    disabled={isDecrypting}
                    className="flex items-center gap-1.5 px-3 py-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                    {isDecrypting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Eye className="h-5 w-5" />}
                    <span>{isDecrypting ? 'Decrypting' : 'View'}</span>
                </button>
            </div>
        </motion.div>
    );
};

// --- (NEW) InfoRow Helper ---
const InfoRow = ({ Icon, label, value, iconColor = "text-gray-500" }) => (
    <div className="flex items-center gap-2 text-sm">
        <Icon className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
        <span className="text-gray-500">{label}:</span>
        <span className="font-medium text-gray-800">{value}</span>
    </div>
);

// --- (NEW) Skeleton Card ---
const DoctorRecordCardSkeleton = () => (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 animate-pulse">
        <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-gray-200 rounded-lg"></div>
            <div className="h-5 bg-gray-200 rounded-lg w-3/4"></div>
        </div>
        <div className="space-y-3 mt-4">
            <div className="h-4 bg-gray-200 rounded-lg w-1/2"></div>
            <div className="h-5 bg-gray-200 rounded-full w-1/3"></div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
            <div className="h-9 w-20 bg-gray-200 rounded-lg"></div>
        </div>
    </div>
);

// --- (NEW) Error Card ---
const DoctorRecordCardError = ({ record }) => (
    <div className="flex flex-col justify-between bg-red-50 rounded-2xl shadow-xl border border-red-200 p-5 border-t-4 border-red-500">
        <div>
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-7 w-7 text-red-600 flex-shrink-0" />
                <h3 className="text-lg font-bold text-red-900 break-words">Loading Failed</h3>
            </div>
            <p className="text-sm text-red-700 mt-2">Could not load metadata for this record (ID: ...{record.recordId.slice(-6)}).</p>
        </div>
        <div className="flex justify-end gap-2 mt-6">
            <button
                disabled={true}
                className="flex items-center gap-1.5 px-3 py-2 text-white bg-gray-400 rounded-lg"
            >
                <Eye className="h-5 w-5" />
                <span>View</span>
            </button>
        </div>
    </div>
);

