"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import VerifiedUploadForm from './VerifiedUploadForm';
import { ethers } from 'ethers';

const SearchIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const UserIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;

const LAB_CATEGORIES = [
    { value: 'lab-result', label: 'Lab Result' },
];

export default function LabTechnicianDashboard() {
    const { contract } = useWeb3();
    const [searchAddress, setSearchAddress] = useState('');
    const [patientProfile, setPatientProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchMessage, setSearchMessage] = useState('Enter a patient\'s wallet address to begin.');

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
            if (user.walletAddress === ethers.ZeroAddress || Number(user.role) !== 0) { // Role 0 is Patient
                toast.error("No patient found with this address.", { id: toastId });
                setSearchMessage("No patient found. Please check the address and ensure they are registered.");
                return;
            }
            
            const profile = await contract.userProfiles(searchAddress);
            const fullProfile = {
                walletAddress: user.walletAddress,
                role: user.role,
                isVerified: user.isVerified,
                publicKey: user.publicKey,
                name: profile.name,
            };
            
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
            setSearchMessage("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-800">Lab Technician Portal</h1>
                <p className="text-lg text-slate-600 mt-2">Upload verified lab results directly to a patient's secure file.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Find Patient</h2>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative flex-grow w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={searchAddress}
                            onChange={(e) => setSearchAddress(e.target.value)}
                            placeholder="Patient's Wallet Address (e.g., 0x...)"
                            className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                            required
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                        <SearchIcon />
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </form>
                
                {searchMessage && <p className="text-center mt-6 text-slate-500">{searchMessage}</p>}
            </div>
            
            {patientProfile && (
                <VerifiedUploadForm 
                    patientProfile={patientProfile}
                    onUploadSuccess={() => {
                        setPatientProfile(null);
                        setSearchAddress('');
                        setSearchMessage('Upload complete. Search for another patient to begin.');
                    }}
                    allowedCategories={LAB_CATEGORIES}
                />
            )}
        </div>
    );
}

