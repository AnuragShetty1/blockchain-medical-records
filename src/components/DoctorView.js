"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context'; // Original aliased path
import toast from 'react-hot-toast';
// CORRECTED: Switched to aliased paths as expected by the build system
import VerifiedUploadForm from '@/components/VerifiedUploadForm';
import DoctorRecordList from '@/components/DoctorRecordList';
import axios from 'axios';
// REMOVED: use-debounce import
// import { useDebounce } from 'use-debounce'; 
import { Stethoscope, UploadCloud, FileSearch, HeartHandshake, Search, User, X as CloseIcon, ChevronDown, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // NEW: Import framer-motion

// REMOVED: StaticClinicalBackground component

// --- DoctorDashboard (Main Component) ---
export default function DoctorDashboard() {
    const { userProfile } = useWeb3();
    const [activeTab, setActiveTab] = useState('upload');

    // REFACTORED: Main layout
    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="w-full max-w-7xl mx-auto space-y-8">
                <DoctorHeader doctorProfile={userProfile} />

                <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

                {/* REFACTORED: Main content area with layout jump fix */}
                <main>
                    <AnimatePresence>
                        <motion.div
                            key={activeTab}
                            className="w-full" // Fixes width jump
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'upload' && <UploadSection />}
                            {activeTab === 'request' && <RequestAccessSection />}
                            {activeTab === 'review' && <ReviewSection />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

// --- REFACTORED: DoctorHeader ---
const DoctorHeader = ({ doctorProfile }) => (
    <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8"
    >
        {!doctorProfile ? (
            <div className="animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="bg-gray-200 p-3 rounded-lg h-14 w-14"></div>
                    <div>
                        <div className="h-8 w-48 bg-gray-200 rounded-md"></div>
                        <div className="h-5 w-64 bg-gray-200 rounded-md mt-3"></div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex items-center gap-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                    <Stethoscope className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Dr. {doctorProfile.name}
                    </h1>
                    <p className="mt-1 text-lg text-gray-600">
                        Welcome to your clinical workspace.
                    </p>
                </div>
            </div>
        )}
    </motion.div>
);

// --- NEW: TabNavigation Component (Matches PatientDashboard) ---
const TabNavigation = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'upload', label: 'Upload New Record', icon: UploadCloud },
        { id: 'request', label: 'Request Record Access', icon: HeartHandshake },
        { id: 'review', label: 'Review Shared Records', icon: FileSearch },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2">
            <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`relative flex-1 flex justify-center items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.id
                                    ? 'text-blue-700'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="doctorTabIndicator"
                                    className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full"
                                />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};


// --- PatientSearchColumn (Restyled Internally) ---
const PatientSearchColumn = ({ onPatientSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    // --- MODIFIED: Replaced useDebounce hook ---
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
    // ---
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchMessage, setSearchMessage] = useState('Start typing to find a patient...');

    // --- NEW: useEffect to implement debounce ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300); // 300ms delay

        // Cleanup function
        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);
    // ---

    // Logic (Unchanged, but now depends on the new debouncedQuery state)
    useEffect(() => {
        const searchPatients = async () => {
            if (debouncedQuery.length < 3) {
                setSearchResults([]);
                setIsSearching(false);
                setSearchMessage(debouncedQuery.length > 0 ? 'Keep typing...' : 'Start typing to find a patient...');
                return;
            }
            setIsSearching(true);
            setSearchMessage('');
            try {
                const response = await axios.get(`http://localhost:3001/api/users/search-patients?q=${debouncedQuery}`);
                if (response.data.success) {
                    setSearchResults(response.data.data);
                    if (response.data.data.length === 0) {
                        setSearchMessage(`No patients found for "${debouncedQuery}".`);
                    }
                }
            } catch (error) {
                toast.error("Search failed.");
                setSearchMessage("Error during search.");
            } finally {
                setIsSearching(false);
            }
        };
        searchPatients();
    }, [debouncedQuery]); // This now correctly depends on the debounced state

    // REFACTORED: Styling
    return (
        <div className="border border-gray-200 rounded-lg bg-gray-50/50 p-4 h-full min-h-[400px] lg:min-h-[500px]">
            <h3 className="font-bold text-gray-800 mb-3 text-lg">Find Patient</h3>
            <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name or wallet address..."
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
                />
                {isSearching && <div className="absolute inset-y-0 right-0 pr-3 flex items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
            </div>
            <div className="overflow-y-auto h-[calc(100%-80px)]">
                {searchResults.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {searchResults.map((patient) => (
                            <button key={patient.address} onClick={() => onPatientSelect(patient)} className="w-full text-left p-3 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-3">
                                <User className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{patient.name}</p>
                                    <p className="text-xs text-gray-500 font-mono truncate">{patient.address}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center pt-12 text-gray-500">{searchMessage}</div>
                )}
            </div>
        </div>
    );
};

// --- UploadSection (Wrapped in Premium Card) ---
const UploadSection = () => {
    const [patientProfile, setPatientProfile] = useState(null);

    // REFACTORED: Wrapped in premium card
    return (
        <motion.div
            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8"
            variants={cardItemVariants} // Use cardItemVariants
            initial="hidden"
            animate="visible"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <PatientSearchColumn onPatientSelect={setPatientProfile} />
                </div>
                <div className="lg:col-span-2">
                    {patientProfile ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-blue-700">Selected Patient:</p>
                                    <p className="font-bold text-blue-900">{patientProfile.name}</p>
                                </div>
                                <button onClick={() => setPatientProfile(null)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                    <CloseIcon className="h-4 w-4" /> Clear
                                </button>
                            </div>
                            <VerifiedUploadForm
                                patientProfile={{ ...patientProfile, walletAddress: patientProfile.address }}
                                onUploadSuccess={() => setPatientProfile(null)}
                                allowedCategories={DOCTOR_CATEGORIES}
                            />
                        </div>
                    ) : (
                        // REFACTORED: Placeholder
                        <div className="h-full min-h-[400px] lg:min-h-[500px] flex flex-col justify-center items-center text-center p-8 bg-gray-50/50 border border-gray-200 rounded-lg">
                            <User className="h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">Select a Patient</h3>
                            <p className="text-gray-500 mt-1 max-w-xs">Use the search panel on the left to find and select a patient to begin uploading a record.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// --- RequestAccessSection (Wrapped in Premium Card) ---
const RequestAccessSection = () => {
    const { api } = useWeb3(); // Logic (Unchanged)
    const [patientProfile, setPatientProfile] = useState(null);
    const [patientRecords, setPatientRecords] = useState([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState(new Set());
    const [justification, setJustification] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Logic (Unchanged)
    useEffect(() => {
        const fetchPatientRecords = async () => {
            if (!patientProfile) return;
            setIsLoadingRecords(true);
            setPatientRecords([]);
            try {
                const response = await axios.get(`http://localhost:3001/api/users/records/patient/${patientProfile.address}`);
                setPatientRecords(response.data.data);
            } catch (error) {
                toast.error("Could not fetch patient's records.");
            } finally {
                setIsLoadingRecords(false);
            }
        };
        fetchPatientRecords();
    }, [patientProfile]);

    // Logic (Unchanged)
    const handleRecordSelect = (recordId) => {
        setSelectedRecords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(recordId)) newSet.delete(recordId);
            else newSet.add(recordId);
            return newSet;
        });
    };

    // Logic (Unchanged)
    const handleSubmitRequest = async () => {
        if (selectedRecords.size === 0) return toast.error("Please select at least one record.");
        if (!api || !patientProfile) return toast.error("API service not loaded or patient not selected.");
        if (!justification.trim()) return toast.error("A justification is required to request records.");

        setIsSubmitting(true);
        const toastId = toast.loading("Submitting access request...");
        try {
            const response = await api.requestRecordAccess(
                patientProfile.address,
                Array.from(selectedRecords),
                justification
            );
            toast.success("Access request submitted!", { id: toastId });
            setSelectedRecords(new Set());
            setJustification('');
        } catch (error) {
            console.error("Failed to submit request:", error);
            toast.error(error.message || "An error occurred.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    // REFACTORED: Wrapped in premium card
    return (
        <motion.div
            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8"
            variants={cardItemVariants} // Use cardItemVariants
            initial="hidden"
            animate="visible"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <PatientSearchColumn onPatientSelect={setPatientProfile} />
                </div>
                <div className="lg:col-span-2">
                    {patientProfile ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-blue-700">Requesting access for:</p>
                                    <p className="font-bold text-blue-900">{patientProfile.name}</p>
                                </div>
                                <button onClick={() => setPatientProfile(null)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                    <CloseIcon className="h-4 w-4" /> Clear
                                </button>
                            </div>
                            {/* REFACTORED: Main content box */}
                            <div className="bg-white p-6 border border-gray-200 rounded-lg">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Select Records to Request</h3>
                                {isLoadingRecords ? (
                                    <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
                                ) : patientRecords.length > 0 ? (
                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                        {patientRecords.map(record => (
                                            <label key={record.recordId} className="flex items-center p-3.5 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition-colors">
                                                <input type="checkbox" checked={selectedRecords.has(record.recordId)} onChange={() => handleRecordSelect(record.recordId)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="ml-4 font-medium text-gray-700">{record.title}</span>
                                                <span className="ml-auto text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">{record.category}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">This patient has no records available to request.</p>
                                )}

                                <div className="pt-6 mt-6 border-t border-gray-200">
                                    <label htmlFor="justification" className="block text-sm font-medium text-gray-700 mb-2">
                                        Reason for Request (Required)
                                    </label>
                                    <textarea
                                        id="justification"
                                        rows="3"
                                        value={justification}
                                        onChange={(e) => setJustification(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        placeholder="e.g., 'Requesting consultation for follow-up on recent lab results.'"
                                        disabled={isSubmitting}
                                    ></textarea>
                                </div>
                                <div className="pt-6 mt-6 border-t border-gray-200">
                                    <button onClick={handleSubmitRequest} disabled={isSubmitting || selectedRecords.size === 0} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm">
                                        {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <>Request Access to {selectedRecords.size} Record(s)</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // REFACTORED: Placeholder
                        <div className="h-full min-h-[400px] lg:min-h-[500px] flex flex-col justify-center items-center text-center p-8 bg-gray-50/50 border border-gray-200 rounded-lg">
                            <User className="h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">Select a Patient</h3>
                            <p className="text-gray-500 mt-1 max-w-xs">Use the search panel on the left to find a patient and view their available records.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// --- ReviewSection (Now renders PatientRecordGroups as cards) ---
const ReviewSection = () => {
    const { account } = useWeb3();
    const [patientGroups, setPatientGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Logic (Unchanged)
    const fetchSharedRecords = useCallback(async () => {
        if (!account) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:3001/api/users/records/professional/${account}`);
            if (response.data.success) {
                setPatientGroups(response.data.data);
            } else {
                setPatientGroups([]);
            }
        } catch (error) {
            setPatientGroups([]);
        } finally {
            setIsLoading(false);
        }
    }, [account]);

    // Logic (Unchanged)
    useEffect(() => {
        fetchSharedRecords();
    }, [fetchSharedRecords]);

    if (isLoading) {
        return (
            <motion.div
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 flex justify-center items-center min-h-[300px]"
                variants={cardItemVariants}
                initial="hidden"
                animate="visible"
            >
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-4 text-gray-500">Loading shared records...</p>
            </motion.div>
        );
    }

    if (patientGroups.length === 0) {
        // REFACTORED: Empty state
        return (
            <motion.div
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 flex flex-col justify-center items-center text-center min-h-[300px]"
                variants={cardItemVariants}
                initial="hidden"
                animate="visible"
            >
                <Info className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-4 text-xl font-bold text-gray-800">No Records Found</h3>
                <p className="mt-1 text-gray-500">Patients who share records with you will appear here.</p>
            </motion.div>
        );
    }

    // REFACTORED: Renders a list of cards
    return (
        <motion.div
            className="space-y-8"
            variants={cardContainerVariants}
            initial="hidden"
            animate="visible"
        >
            {patientGroups.map(({ patient, records }, index) => (
                <PatientRecordGroup key={patient.address} patient={patient} records={records} customIndex={index} />
            ))}
        </motion.div>
    );
};

// --- PatientRecordGroup (Now a premium card) ---
const PatientRecordGroup = ({ patient, records, customIndex }) => {
    const [isOpen, setIsOpen] = useState(true);

    // REFACTORED: Styles
    return (
        <motion.div
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            variants={cardItemVariants}
            custom={customIndex}
        >
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-gray-500" />
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{patient.name}</h3>
                        <p className="text-sm text-gray-500 font-mono">{patient.address}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{records.length} Record(s)</span>
                    <ChevronDown className={`h-6 w-6 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {/* REFACTORED: Use AnimatePresence for smooth open/close */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="border-t border-gray-200 overflow-hidden"
                    >
                        {/* DoctorRecordList is an external component, renders as-is */}
                        <DoctorRecordList records={records} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- STATIC "MODERN CLINICAL" BACKGROUND (Helper) ---
// This is used internally by VerifiedUploadForm, so we must define it.
// It is not used by the dashboard background itself anymore.
const DOCTOR_CATEGORIES = [
    { value: 'doctor-note', label: 'Doctor\'s Note' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'lab-result', label: 'Lab Result' },
    { value: 'other', label: 'Other' },
];

// --- Animation Variants (Helper) ---
// These are used by the child components (UploadSection, etc.)
const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const cardItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({ // `i` is a custom index for stagger
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.05,
            type: "spring",
            stiffness: 100
        },
    }),
};

