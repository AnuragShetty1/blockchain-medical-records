"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import VerifiedUploadForm from './VerifiedUploadForm';
import { ethers } from 'ethers';

// --- ICONS ---
const SearchIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const UserIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const UploadIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>;
const RecordsIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;


const DOCTOR_CATEGORIES = [
    { value: 'doctor-note', label: 'Doctor\'s Note' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'lab-result', label: 'Lab Result' },
    { value: 'other', label: 'Other' },
];

export default function DoctorDashboard() {
    const { contract, userProfile } = useWeb3();
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'review'

    return (
        <div className="w-full min-h-[calc(100vh-128px)] bg-slate-50">
             <header className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <h1 className="text-3xl font-bold text-slate-900">Doctor's Dashboard</h1>
                    <p className="mt-1 text-slate-600">Welcome back, Dr. {userProfile?.name.split(' ').pop()}!</p>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 <div className="border-b border-slate-200 mb-8">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <TabButton id="upload" label="Upload for Patient" icon={<UploadIcon />} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="review" label="Review Patient Records" icon={<RecordsIcon />} activeTab={activeTab} setActiveTab={setActiveTab} />
                    </nav>
                </div>

                {activeTab === 'upload' && <UploadSection />}
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
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors`}
    >
        {icon}
        {label}
    </button>
);

const UploadSection = () => {
    const { contract } = useWeb3();
    const [searchAddress, setSearchAddress] = useState('');
    const [patientProfile, setPatientProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchMessage, setSearchMessage] = useState('Enter a patient\'s wallet address to upload a new verified record for them.');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!ethers.isAddress(searchAddress)) {
            toast.error("Please enter a valid Ethereum wallet address.");
            return;
        }
        setIsLoading(true);
        setPatientProfile(null);
        const toastId = toast.loading("Searching for patient...");
        try {
            const user = await contract.users(searchAddress);
            if (user.walletAddress === ethers.ZeroAddress || Number(user.role) !== 0) {
                toast.error("No patient found with this address.", { id: toastId });
                setSearchMessage("No patient found. Please check the address and ensure they are registered.");
                return;
            }
            const profile = await contract.userProfiles(searchAddress);
            const fullProfile = { walletAddress: user.walletAddress, publicKey: user.publicKey, name: profile.name };
            if (!fullProfile.publicKey) {
                 toast.error("This patient has not completed their security setup.", { id: toastId });
                 setSearchMessage("This patient's profile is incomplete. They must save their public key before you can upload records for them.");
                 return;
            }
            setPatientProfile(fullProfile);
            toast.success(`Found patient: ${fullProfile.name}`, { id: toastId });
            setSearchMessage('');
        } catch (error) {
            console.error("Failed to search for patient:", error);
            toast.error("An error occurred during search.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Find Patient to Upload For</h2>
                 <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative flex-grow w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon className="text-slate-400" /></div>
                        <input type="text" value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)} placeholder="Patient's Wallet Address (e.g., 0x...)" className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition" required />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                        <SearchIcon />
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </form>
                {searchMessage && <p className="text-center mt-6 text-slate-500">{searchMessage}</p>}
            </div>
            {patientProfile && (
                <VerifiedUploadForm patientProfile={patientProfile} onUploadSuccess={() => { setPatientProfile(null); setSearchAddress(''); }} allowedCategories={DOCTOR_CATEGORIES} />
            )}
        </div>
    );
};

const ReviewSection = () => {
    // This section is a placeholder for future functionality.
    // The current smart contract does not easily allow a doctor to see a list of patients who granted them access.
    // A future update with an off-chain indexer (Phase 3) or contract events would be needed to build this view efficiently.
    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center">
             <h2 className="text-2xl font-bold text-slate-900 mb-4">Patient Record Review</h2>
             <p className="text-slate-600 max-w-2xl mx-auto">
                This feature will allow you to view records from patients who have granted you access. The current smart contract architecture requires a patient to share a specific record's ID with you directly. A future update will provide a dashboard of all patients who have shared records with you.
             </p>
             <div className="mt-6">
                {/* We can build out the manual search for a specific record ID here if desired as a next step */}
                 <p className="text-sm text-slate-500">Feature currently under development.</p>
             </div>
        </div>
    );
};

