"use client";

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import axios from 'axios';
import toast from 'react-hot-toast';
import { rewrapSymmetricKey } from '@/utils/crypto';
import { fetchFromIPFS } from '@/utils/ipfs'; // --- MODIFICATION: Import the resilient IPFS fetch utility ---

// --- ICONS ---
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const LockIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
const CloseIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;


export default function ShareRecordsModal({ records, recordsToShare, onClose }) {
    // We now get `records` from props, so we only need contract and keyPair from context.
    const { contract, keyPair } = useWeb3();

    const [hospitals, setHospitals] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedProfessionalAddress, setSelectedProfessionalAddress] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch all hospitals when the modal mounts
    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/users/hospitals');
                if (response.data.success) {
                    setHospitals(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch hospitals:", error);
                toast.error("Could not fetch hospitals list.");
            }
        };
        fetchHospitals();
    }, []);

    // Fetch professionals when a hospital is selected
    useEffect(() => {
        const fetchProfessionals = async () => {
            if (!selectedHospital) {
                setProfessionals([]);
                setSelectedProfessionalAddress('');
                return;
            }
            try {
                const response = await axios.get(`http://localhost:3001/api/users/hospitals/${selectedHospital}/professionals`);
                if (response.data.success) {
                    setProfessionals(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch professionals:", error);
                toast.error("Could not fetch professionals list.");
            }
        };
        fetchProfessionals();
    }, [selectedHospital]);


    const handleGrantAccess = async () => {
        if (!contract || !keyPair?.privateKey || !selectedProfessionalAddress || recordsToShare.length === 0) {
            toast.error("Cannot proceed. Required information is missing.");
            return;
        }

        setIsProcessing(true);
        const toastId = toast.loading("Preparing secure access...");

        try {
            // 1. Get professional's public key
            const professionalUser = professionals.find(p => p.address === selectedProfessionalAddress);
            if (!professionalUser?.publicKey) {
                throw new Error("Professional's public key not found.");
            }

            // 2. Re-wrap the symmetric key for each record by fetching the bundle from IPFS
            toast.loading("Fetching encryption bundles and re-wrapping keys...", { id: toastId });
            
            const rewrappedKeys = await Promise.all(
                recordsToShare.map(async (recordId) => {
                    // Use the `records` list passed down from the parent component
                    const record = records.find(r => r.recordId === recordId);
                    if (!record) throw new Error(`Record with ID ${recordId} not found.`);
                    
                    // --- MODIFICATION: Use the new utility to fetch metadata ---
                    const metaResponse = await fetchFromIPFS(record.ipfsHash);
                    const metadata = await metaResponse.json();

                    // --- MODIFICATION: Use the new utility to fetch the encrypted bundle ---
                    const bundleResponse = await fetchFromIPFS(metadata.encryptedBundleIPFSHash);
                    const encryptedBundle = await bundleResponse.json();

                    // Now rewrap with the full bundle
                    return await rewrapSymmetricKey(encryptedBundle, keyPair.privateKey, professionalUser.publicKey);
                })
            );

            // 3. Send transaction to the blockchain
            toast.loading("Sending transaction to the blockchain...", { id: toastId });
            const durationInDays = 30; // Default duration
            const tx = await contract.grantMultipleRecordAccess(recordsToShare, selectedProfessionalAddress, durationInDays, rewrappedKeys);
            await tx.wait();

            toast.success("Access granted successfully!", { id: toastId });
            onClose(); // Close the modal on success

        } catch (error) {
            console.error("Failed to grant access:", error);
            toast.error(error.message || "An unexpected error occurred.", { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800">Share Medical Records</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100">
                        <CloseIcon />
                    </button>
                </div>

                <div className="mt-6 space-y-6">
                    <div>
                        <label htmlFor="hospital-select" className="block text-sm font-medium text-slate-700 mb-1">
                            1. Select a Hospital
                        </label>
                        <select
                            id="hospital-select"
                            value={selectedHospital}
                            onChange={(e) => setSelectedHospital(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            <option value="">-- Choose a hospital --</option>
                            {hospitals.map(hospital => (
                                <option key={hospital._id} value={hospital.hospitalId}>
                                    {hospital.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="professional-select" className="block text-sm font-medium text-slate-700 mb-1">
                           2. Select a Healthcare Professional
                        </label>
                        <select
                            id="professional-select"
                            value={selectedProfessionalAddress}
                            onChange={(e) => setSelectedProfessionalAddress(e.target.value)}
                            disabled={!selectedHospital || professionals.length === 0}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-slate-100"
                        >
                            <option value="">-- Choose a professional --</option>
                             {professionals.map(prof => (
                                <option key={prof._id} value={prof.address}>
                                    {prof.name} ({prof.role})
                                </option>
                            ))}
                        </select>
                         {selectedHospital && professionals.length === 0 && (
                            <p className="text-xs text-slate-500 mt-1">No professionals found for this hospital.</p>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGrantAccess}
                        disabled={!selectedProfessionalAddress || isProcessing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition shadow-sm"
                    >
                        {isProcessing ? <SpinnerIcon /> : <LockIcon />}
                        Grant Access
                    </button>
                </div>
            </div>
        </div>
    );
}
