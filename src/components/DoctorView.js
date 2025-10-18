"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import VerifiedUploadForm from './VerifiedUploadForm';
import DoctorRecordList from './DoctorRecordList';
import axios from 'axios';
import { useDebounce } from 'use-debounce';

// --- ICONS ---
const SearchIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const UserIcon = (props) => <svg className={props.className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const UploadIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>;
const RecordsIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const RequestIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25l-1.28.512c-2.097.839-4.445-1.043-3.614-3.141l.342-1.025a.75.75 0 01.636-.492h6.212a2.25 2.25 0 002.25-2.25v-1.125a2.25 2.25 0 00-2.25-2.25H9.75A.75.75 0 019 7.125v1.5" /></svg>
const InfoIcon = () => <svg className="w-12 h-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500"></div>;
const ButtonSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>;
const CloseIcon = () => <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

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
        <div className="w-full min-h-[calc(100vh-128px)] bg-slate-100">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Doctor's Dashboard</h1>
                    {userProfile?.name && <p className="mt-1 text-slate-600">Welcome back, Dr. {userProfile.name.split(' ').pop()}!</p>}
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <nav className="border-b border-slate-200" aria-label="Tabs">
                         <div className="-mb-px flex space-x-8">
                             <TabButton id="upload" label="Upload for Patient" icon={<UploadIcon />} activeTab={activeTab} setActiveTab={setActiveTab} />
                             <TabButton id="request" label="Request Access" icon={<RequestIcon />} activeTab={activeTab} setActiveTab={setActiveTab} />
                             <TabButton id="review" label="Review Shared Records" icon={<RecordsIcon />} activeTab={activeTab} setActiveTab={setActiveTab} />
                         </div>
                    </nav>
                </div>

                {activeTab === 'upload' && <UploadSection />}
                {activeTab === 'request' && <RequestAccessSection />}
                {activeTab === 'review' && <ReviewSection />}
            </main>
        </div>
    );
}

const TabButton = ({ id, label, icon, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`${
            activeTab === id
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500`}
    >
        {icon}
        {label}
    </button>
);

const UploadSection = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery] = useDebounce(searchQuery, 300);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [patientProfile, setPatientProfile] = useState(null);
    const [searchMessage, setSearchMessage] = useState('Enter a patient\'s name or wallet address to begin.');

    useEffect(() => {
        const searchPatients = async () => {
            if (debouncedQuery.length < 3) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            setSearchMessage('');
            try {
                const response = await axios.get(`http://localhost:3001/api/users/search-patients?q=${debouncedQuery}`);
                if (response.data.success) {
                    setSearchResults(response.data.data);
                    if (response.data.data.length === 0) {
                        setSearchMessage(`No patients found matching "${debouncedQuery}".`);
                    }
                } else {
                    toast.error('Search failed. Please try again.');
                }
            } catch (error) {
                console.error("Failed to search for patients:", error);
                toast.error("An error occurred while searching.");
                setSearchMessage("The search service is currently unavailable.");
            } finally {
                setIsSearching(false);
            }
        };

        searchPatients();
    }, [debouncedQuery]);

    const handleSelectPatient = (patient) => {
        if (!patient.publicKey) {
             toast.error("This patient has not completed their security setup.");
             setSearchMessage("This patient must save their public key before you can upload records for them.");
             return;
        }
        setPatientProfile({ ...patient, walletAddress: patient.address });
        setSearchQuery('');
        setSearchResults([]);
        setSearchMessage('');
    };
    
    const handleClearPatient = () => {
        setPatientProfile(null);
        setSearchMessage('Enter a patient\'s name or wallet address to begin.');
    };

    if (patientProfile) {
        return (
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-600">Selected Patient:</p>
                        <p className="font-bold text-slate-800">{patientProfile.name}</p>
                    </div>
                    <button 
                        onClick={handleClearPatient}
                        className="text-sm font-medium text-teal-600 hover:text-teal-800 flex items-center gap-1">
                        <CloseIcon /> Change Patient
                    </button>
                </div>
                <VerifiedUploadForm 
                    patientProfile={patientProfile} 
                    onUploadSuccess={handleClearPatient} 
                    allowedCategories={DOCTOR_CATEGORIES} 
                />
            </div>
        )
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Find Patient</h2>
            <p className="text-slate-500 mb-6">Search for a patient by their name or wallet address to upload a new record.</p>
            
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="text-slate-400" />
                </div>
                <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    placeholder="e.g., Jane Doe or 0x..." 
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition" 
                />
                {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Spinner />
                    </div>
                )}
            </div>

            {searchResults.length > 0 ? (
                <div className="mt-4 border border-slate-200 rounded-lg bg-white max-h-60 overflow-y-auto divide-y divide-slate-200">
                    {searchResults.map((patient) => (
                        <button 
                            key={patient.address}
                            onClick={() => handleSelectPatient(patient)}
                            className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center gap-3"
                        >
                            <UserIcon className="w-5 h-5 text-slate-500" />
                            <div>
                                <p className="font-medium text-slate-800">{patient.name}</p>
                                <p className="text-xs text-slate-500 font-mono">
                                    {`${patient.address.substring(0, 12)}...${patient.address.substring(patient.address.length - 8)}`}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-10">
                    {searchMessage && <p className="text-slate-500">{searchMessage}</p>}
                </div>
            )}
        </div>
    );
};

const RequestAccessSection = () => {
    const { contract } = useWeb3();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery] = useDebounce(searchQuery, 300);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [patientProfile, setPatientProfile] = useState(null);
    const [searchMessage, setSearchMessage] = useState('Enter a patient\'s name or wallet address to begin.');
    const [patientRecords, setPatientRecords] = useState([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const searchPatients = async () => {
            if (debouncedQuery.length < 3) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            try {
                const response = await axios.get(`http://localhost:3001/api/users/search-patients?q=${debouncedQuery}`);
                setSearchResults(response.data.data);
            } catch (error) {
                toast.error("Search failed.");
            } finally {
                setIsSearching(false);
            }
        };
        searchPatients();
    }, [debouncedQuery]);
    
    useEffect(() => {
        const fetchPatientRecords = async () => {
            if (!patientProfile) return;
            setIsLoadingRecords(true);
            try {
                const response = await axios.get(`http://localhost:3001/api/users/records/patient/${patientProfile.address}`);
                setPatientRecords(response.data.data);
            } catch (error) {
                toast.error("Could not fetch patient's records.");
                setPatientRecords([]);
            } finally {
                setIsLoadingRecords(false);
            }
        };
        fetchPatientRecords();
    }, [patientProfile]);

    const handleSelectPatient = (patient) => {
        setPatientProfile({ ...patient, walletAddress: patient.address });
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleClearPatient = () => {
        setPatientProfile(null);
        setPatientRecords([]);
        setSelectedRecords(new Set());
    };

    const handleRecordSelect = (recordId) => {
        setSelectedRecords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(recordId)) {
                newSet.delete(recordId);
            } else {
                newSet.add(recordId);
            }
            return newSet;
        });
    };
    
    const handleSubmitRequest = async () => {
        if (selectedRecords.size === 0) {
            toast.error("Please select at least one record to request access.");
            return;
        }
        if (!contract || !patientProfile) {
            toast.error("Contract not loaded or patient not selected.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Submitting access request on the blockchain...");

        try {
            const recordIds = Array.from(selectedRecords);
            const tx = await contract.requestRecordAccess(patientProfile.address, recordIds);
            await tx.wait();
            toast.success("Access request submitted successfully!", { id: toastId });
            setSelectedRecords(new Set());
        } catch (error) {
            console.error("Failed to submit access request:", error);
            toast.error(error?.data?.message || "An error occurred.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (patientProfile) {
        return (
            <div className="space-y-6">
                 <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-600">Requesting access for:</p>
                        <p className="font-bold text-slate-800">{patientProfile.name}</p>
                    </div>
                    <button onClick={handleClearPatient} className="text-sm font-medium text-teal-600 hover:text-teal-800 flex items-center gap-1">
                        <CloseIcon /> Change Patient
                    </button>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Select Records to Request</h3>
                    {isLoadingRecords ? (
                        <div className="flex justify-center items-center py-8"><Spinner /></div>
                    ) : patientRecords.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                           {patientRecords.map(record => (
                               <label key={record.recordId} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-teal-50/50 hover:border-teal-200 transition-colors">
                                   <input type="checkbox" checked={selectedRecords.has(record.recordId)} onChange={() => handleRecordSelect(record.recordId)} className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                                   <span className="ml-4 font-medium text-slate-700">{record.title}</span>
                                   <span className="ml-auto text-sm text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{record.category}</span>
                               </label>
                           ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">This patient has no records yet.</p>
                    )}
                     <div className="pt-6 mt-6 border-t border-slate-200">
                        <button onClick={handleSubmitRequest} disabled={isSubmitting || selectedRecords.size === 0} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm">
                           {isSubmitting ? <><ButtonSpinner /> Submitting...</> : <>Request Access to {selectedRecords.size} Record(s)</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    // Patient Search UI (same as UploadSection)
    return (
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-slate-200">
             <h2 className="text-xl font-bold text-slate-800 mb-1">Find Patient</h2>
            <p className="text-slate-500 mb-6">Search for a patient to view their records and request access.</p>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g., Jane Doe or 0x..." className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition" />
                {isSearching && <div className="absolute inset-y-0 right-0 pr-3 flex items-center"><Spinner /></div>}
            </div>
            {searchResults.length > 0 && (
                <div className="mt-4 border border-slate-200 rounded-lg bg-white max-h-60 overflow-y-auto divide-y divide-slate-200">
                    {searchResults.map((patient) => (
                        <button key={patient.address} onClick={() => handleSelectPatient(patient)} className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center gap-3">
                            <UserIcon className="w-5 h-5 text-slate-500" />
                            <div>
                                <p className="font-medium text-slate-800">{patient.name}</p>
                                <p className="text-xs text-slate-500 font-mono">{`${patient.address.substring(0, 12)}...${patient.address.substring(patient.address.length - 8)}`}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const ReviewSection = () => {
    const { contract, account, keyPair } = useWeb3();
    const [sharedRecords, setSharedRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSharedRecords = useCallback(async () => {
        // ... (rest of the fetch logic is unchanged and correct)
    }, [contract, account, keyPair]);

    useEffect(() => {
        // ... (useEffect logic is unchanged and correct)
    }, [fetchSharedRecords]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-12 bg-white rounded-lg shadow-sm border-slate-200">
                <Spinner />
                <p className="ml-4 text-slate-500">Searching for records shared with you...</p>
            </div>
        );
    }

    if (sharedRecords.length === 0) {
        return (
            <div className="text-center p-12 bg-white rounded-lg shadow-sm border-slate-200">
                <InfoIcon />
                <h3 className="mt-4 text-lg font-medium text-slate-800">No Records Found</h3>
                <p className="mt-1 text-slate-500">No patients have shared medical records with you yet.</p>
            </div>
        )
    }

    return <DoctorRecordList records={sharedRecords} />;
};
