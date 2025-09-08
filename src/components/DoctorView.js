"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import DoctorRecordList from './DoctorRecordList'; // <-- IMPORT the new component
import toast from 'react-hot-toast';

/**
 * DoctorView component for verified doctors to fetch and view patient records.
 * Features a professional split-screen layout to separate the informational panel from the interactive form and results.
 */
export default function DoctorView() {
    const { contract, account } = useWeb3();
    const [patientAddress, setPatientAddress] = useState('');
    // --- THIS STATE NOW HOLDS THE PROCESSED METADATA ---
    const [patientRecords, setPatientRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [searchedAddress, setSearchedAddress] = useState(''); // Keep track of the last searched address

    /**
     * Handles fetching and processing a patient's medical records metadata.
     */
    const handleFetchRecords = async (e) => {
        e.preventDefault();
        if (!patientAddress || !contract || !account) {
            toast.error("Please enter a patient address.");
            return;
        }

        setIsLoading(true);
        setMessage('');
        setPatientRecords([]);
        setSearchedAddress(patientAddress); // Set the address we are searching for
        const toastId = toast.loading(`Fetching records for patient ${patientAddress.substring(0, 8)}...`);

        try {
            const hasAccess = await contract.checkAccess(patientAddress, account);
            if (!hasAccess) {
                toast.error("You do not have permission to view these records.", { id: toastId });
                setMessage("Access denied. The patient has not granted you permission.");
                setIsLoading(false);
                return;
            }

            // --- UPGRADED LOGIC ---
            // Step 1: Fetch the raw record structs (containing metadata hashes)
            const recordStructs = await contract.getPatientRecords(patientAddress);

            if (recordStructs.length === 0) {
                toast.success("No records found for this patient.", { id: toastId });
                setMessage("This patient has not uploaded any medical records yet.");
                setIsLoading(false);
                return;
            }

            // Step 2: Fetch the actual metadata from IPFS for each record
            toast.loading(`Found ${recordStructs.length} record(s). Fetching details...`, { id: toastId });
            const recordsWithMetadata = await Promise.all(
                recordStructs.map(async (record) => {
                    try {
                        const metadataUrl = `https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`;
                        const response = await fetch(metadataUrl);
                        if (!response.ok) {
                            console.error(`Failed to fetch metadata for hash: ${record.ipfsHash}`);
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
                        console.error(`Error processing record ${record.ipfsHash}:`, error);
                        return { ipfsHash: record.ipfsHash, timestamp: Number(record.timestamp), description: "Error reading metadata.", fileName: "Unknown" };
                    }
                })
            );

            setPatientRecords(recordsWithMetadata);
            toast.success(`Successfully fetched ${recordsWithMetadata.length} record(s).`, { id: toastId });
        } catch (error) {
            console.error("Failed to fetch records:", error);
            toast.error("Could not fetch records. Please check the address.", { id: toastId });
            setMessage("An error occurred while fetching records.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div className="p-8">
                <div className="flex items-center justify-center md:justify-start mb-6">
                    <div className="bg-teal-100 p-4 rounded-full">
                        <svg className="w-12 h-12 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                    </div>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-4">Doctor's Portal</h1>
                <p className="text-lg text-slate-600 mb-8">
                    Access patient records securely. Enter a patient's wallet address to retrieve their medical history, provided they have granted you access.
                </p>
                <ul className="space-y-4">
                    <li className="flex items-start">
                        <svg className="w-6 h-6 text-teal-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <div>
                            <h3 className="font-semibold text-slate-700">Permission-Based</h3>
                            <p className="text-slate-500 text-sm">You can only view records for patients who have granted you access.</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <svg className="w-6 h-6 text-teal-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <div>
                            <h3 className="font-semibold text-slate-700">Verified Access</h3>
                            <p className="text-slate-500 text-sm">All access attempts are verified on-chain, ensuring a transparent trail.</p>
                        </div>
                    </li>
                </ul>
            </div>

            <div className="space-y-8">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-slate-200">
                    <h2 className="text-2xl font-bold text-center text-slate-900">View Patient Records</h2>
                    <form onSubmit={handleFetchRecords} className="space-y-6">
                        <div>
                            <label htmlFor="patientAddress" className="block text-sm font-medium text-slate-700 mb-1">Patient's Wallet Address</label>
                            <div className="relative">
                                <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm-2.25-2.25v-1.5a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25v1.5m-19.5-6.375a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25v1.5" />
                                </svg>
                                <input id="patientAddress" type="text" value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} placeholder="0x..." className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition" required />
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                            {isLoading ? 'Fetching...' : 'Fetch Records'}
                        </button>
                    </form>
                </div>

                <div>
                    {/* --- USE THE NEW COMPONENT --- */}
                    {searchedAddress && !isLoading && <DoctorRecordList records={patientRecords} />}
                    {message && <p className="mt-4 text-center text-slate-600">{message}</p>}
                </div>
            </div>
        </div>
    );
}
