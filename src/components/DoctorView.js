"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import VerifiedUploadForm from './VerifiedUploadForm';
import DoctorRecordList from './DoctorRecordList';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import { Stethoscope, UploadCloud, FileSearch, HeartHandshake, Search, User, X as CloseIcon, ChevronDown, Info, Loader2 } from 'lucide-react';

// --- STATIC "MODERN CLINICAL" BACKGROUND ---
const StaticClinicalBackground = () => {
    const svgGridPattern = encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>
            <path d='M0 1 L40 1 M1 0 L1 40' stroke='#E0E7FF' stroke-width='0.5'/>
        </svg>
    `);
    return (
        <>
            <style jsx global>{`
                .clinical-background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: -1;
                    background-color: #F9FAFB;
                    background-image: 
                        linear-gradient(to bottom, rgba(240, 245, 255, 0.8), rgba(255, 255, 255, 1)),
                        url("data:image/svg+xml,${svgGridPattern}");
                }
            `}</style>
            <div className="clinical-background" aria-hidden="true"></div>
        </>
    );
};

// --- REDESIGNED WELCOME HEADER ---
const DoctorHeader = ({ doctorProfile }) => (
    <div className="mb-8">
        {!doctorProfile ? (
            <div className="animate-pulse">
                <div className="h-10 w-3/4 bg-slate-200 rounded-md"></div>
                <div className="h-5 w-1/2 bg-slate-200 rounded-md mt-3"></div>
            </div>
        ) : (
            <div className="flex items-center gap-4">
                <div className="bg-sky-100 text-sky-600 p-3 rounded-lg">
                    <Stethoscope className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-slate-900">
                        Dr. {doctorProfile.name}
                    </h1>
                    <p className="mt-1 text-lg text-slate-500">
                        Welcome to your clinical workspace.
                    </p>
                </div>
            </div>
        )}
    </div>
);

const DOCTOR_CATEGORIES = [
    { value: 'doctor-note', label: 'Doctor\'s Note' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'lab-result', label: 'Lab Result' },
    { value: 'other', label: 'Other' },
];

export default function DoctorDashboard() {
    const { userProfile } = useWeb3();
    const [activeTab, setActiveTab] = useState('upload');

    return (
        <div className="relative w-full min-h-[calc(100vh-128px)]">
            <StaticClinicalBackground />
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <DoctorHeader doctorProfile={userProfile} />
                
                <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 overflow-hidden ring-1 ring-black ring-opacity-5">
                    <nav className="border-b border-slate-900/10 px-6">
                        <div className="-mb-px flex space-x-8">
                            <TabButton id="upload" label="Upload New Record" icon={<UploadCloud />} activeTab={activeTab} setActiveTab={setActiveTab} />
                            <TabButton id="request" label="Request Record Access" icon={<HeartHandshake />} activeTab={activeTab} setActiveTab={setActiveTab} />
                            <TabButton id="review" label="Review Shared Records" icon={<FileSearch />} activeTab={activeTab} setActiveTab={setActiveTab} />
                        </div>
                    </nav>
                    <div className="p-6">
                        {activeTab === 'upload' && <UploadSection />}
                        {activeTab === 'request' && <RequestAccessSection />}
                        {activeTab === 'review' && <ReviewSection />}
                    </div>
                </div>
            </main>
        </div>
    );
}

const TabButton = ({ id, label, icon, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`${
            activeTab === id
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-base inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500`}
    >
        {icon}
        {label}
    </button>
);

const PatientSearchColumn = ({ onPatientSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery] = useDebounce(searchQuery, 300);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchMessage, setSearchMessage] = useState('Start typing to find a patient...');

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
    }, [debouncedQuery]);

    return (
        <div className="border border-slate-200 rounded-lg bg-white p-4 h-full">
            <h3 className="font-bold text-slate-800 mb-3">Find Patient</h3>
            <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name or wallet address..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 transition"
                />
                 {isSearching && <div className="absolute inset-y-0 right-0 pr-3 flex items-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
                {searchResults.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {searchResults.map((patient) => (
                            <button key={patient.address} onClick={() => onPatientSelect(patient)} className="w-full text-left p-3 hover:bg-sky-50 rounded-md transition-colors flex items-center gap-3">
                                <User className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-800 truncate">{patient.name}</p>
                                    <p className="text-xs text-slate-500 font-mono truncate">{patient.address}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center pt-12 text-slate-500">{searchMessage}</div>
                )}
            </div>
        </div>
    );
};

// --- UPLOAD SECTION REBUILT WITH TWO-COLUMN LAYOUT ---
const UploadSection = () => {
    const [patientProfile, setPatientProfile] = useState(null);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <PatientSearchColumn onPatientSelect={setPatientProfile} />
            </div>
            <div className="lg:col-span-2">
                {patientProfile ? (
                    <div className="space-y-4">
                        <div className="bg-sky-50 p-4 rounded-lg border border-sky-200 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-sky-700">Selected Patient:</p>
                                <p className="font-bold text-sky-900">{patientProfile.name}</p>
                            </div>
                            <button onClick={() => setPatientProfile(null)} className="text-sm font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1">
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
                    <div className="h-full flex flex-col justify-center items-center text-center p-8 bg-white border border-slate-200 rounded-lg">
                        <User className="h-16 w-16 text-slate-300 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">Select a Patient</h3>
                        <p className="text-slate-500 mt-1">Use the search panel on the left to find and select a patient to begin uploading a record.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- REQUEST ACCESS SECTION REBUILT WITH TWO-COLUMN LAYOUT ---
const RequestAccessSection = () => {
    const { contract } = useWeb3();
    const [patientProfile, setPatientProfile] = useState(null);
    const [patientRecords, setPatientRecords] = useState([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleRecordSelect = (recordId) => {
        setSelectedRecords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(recordId)) newSet.delete(recordId);
            else newSet.add(recordId);
            return newSet;
        });
    };
    
    const handleSubmitRequest = async () => {
        if (selectedRecords.size === 0) return toast.error("Please select at least one record.");
        if (!contract || !patientProfile) return toast.error("Contract not loaded or patient not selected.");
        
        setIsSubmitting(true);
        const toastId = toast.loading("Submitting access request...");
        try {
            const tx = await contract.requestRecordAccess(patientProfile.address, Array.from(selectedRecords));
            await tx.wait();
            toast.success("Access request submitted!", { id: toastId });
            setSelectedRecords(new Set());
        } catch (error) {
            toast.error(error?.data?.message || "An error occurred.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <PatientSearchColumn onPatientSelect={setPatientProfile} />
            </div>
            <div className="lg:col-span-2">
                {patientProfile ? (
                    <div className="space-y-4">
                        <div className="bg-sky-50 p-4 rounded-lg border border-sky-200 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-sky-700">Requesting access for:</p>
                                <p className="font-bold text-sky-900">{patientProfile.name}</p>
                            </div>
                            <button onClick={() => setPatientProfile(null)} className="text-sm font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1">
                                <CloseIcon className="h-4 w-4" /> Clear
                            </button>
                        </div>
                        <div className="bg-white p-6 border border-slate-200 rounded-lg">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Select Records to Request</h3>
                            {isLoadingRecords ? (
                                <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
                            ) : patientRecords.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {patientRecords.map(record => (
                                        <label key={record.recordId} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-sky-50/50 hover:border-sky-200 transition-colors">
                                            <input type="checkbox" checked={selectedRecords.has(record.recordId)} onChange={() => handleRecordSelect(record.recordId)} className="h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                                            <span className="ml-4 font-medium text-slate-700">{record.title}</span>
                                            <span className="ml-auto text-sm text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{record.category}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-8">This patient has no records available to request.</p>
                            )}
                             <div className="pt-6 mt-6 border-t border-slate-200">
                                <button onClick={handleSubmitRequest} disabled={isSubmitting || selectedRecords.size === 0} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm">
                                    {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <>Request Access to {selectedRecords.size} Record(s)</>}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col justify-center items-center text-center p-8 bg-white border border-slate-200 rounded-lg">
                        <User className="h-16 w-16 text-slate-300 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">Select a Patient</h3>
                        <p className="text-slate-500 mt-1">Use the search panel on the left to find a patient and view their available records.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- REVIEW SECTION REBUILT WITH PATIENT CARDS & TABLE ---
const ReviewSection = () => {
    const { account } = useWeb3();
    const [patientGroups, setPatientGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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

    useEffect(() => {
        fetchSharedRecords();
    }, [fetchSharedRecords]);

    if (isLoading) {
        return <div className="flex justify-center items-center p-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /> <p className="ml-4 text-slate-500">Loading shared records...</p></div>;
    }

    if (patientGroups.length === 0) {
        return (
            <div className="text-center p-12 bg-slate-50 rounded-lg">
                <Info className="h-12 w-12 mx-auto text-slate-400" />
                <h3 className="mt-4 text-lg font-medium text-slate-800">No Records Found</h3>
                <p className="mt-1 text-slate-500">Patients who share records with you will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {patientGroups.map(({ patient, records }) => (
                <PatientRecordGroup key={patient.address} patient={patient} records={records} />
            ))}
        </div>
    );
};

const PatientRecordGroup = ({ patient, records }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-slate-500" />
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">{patient.name}</h3>
                        <p className="text-sm text-slate-500 font-mono">{patient.address}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium bg-sky-100 text-sky-800 px-3 py-1 rounded-full">{records.length} Record(s)</span>
                    <ChevronDown className={`h-6 w-6 text-slate-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-slate-200">
                    <DoctorRecordList records={records} />
                </div>
            )}
        </div>
    );
};
