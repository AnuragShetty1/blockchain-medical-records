"use client";

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { rewrapSymmetricKey } from '@/utils/crypto'; // Import the rewrap utility
import axios from 'axios';
import toast from 'react-hot-toast';

// --- ICONS ---
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>;
const RevokeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500"></div>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const SpinnerWhite = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>;


export default function AccessManagement() {
    const { account, contract } = useWeb3(); // Get contract from context
    const [grants, setGrants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [isRevoking, setIsRevoking] = useState(null); // Track which grant is being revoked

    const fetchGrants = async () => {
        if (!account) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:3001/api/users/access-grants/patient/${account}`);
            if (response.data.success) {
                setGrants(response.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch access grants:", error);
            toast.error("Could not fetch your active grants.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGrants();
    }, [account]);

    const handleRevoke = async (professionalAddress, recordIds) => {
        if (!contract) {
            toast.error("Blockchain contract not available.");
            return;
        }
        setIsRevoking(professionalAddress);
        const toastId = toast.loading("Preparing revocation transaction...");
        try {
            const tx = await contract.revokeMultipleRecordAccess(professionalAddress, recordIds);
            toast.loading("Broadcasting transaction...", { id: toastId });
            await tx.wait();
            toast.success("Access successfully revoked! The list will update shortly.", { id: toastId });
            setTimeout(fetchGrants, 4000); // Give indexer time to process the event
        } catch (error) {
            console.error("Revocation failed:", error);
            toast.error(error?.data?.message || "Revocation transaction failed.", { id: toastId });
        } finally {
            setIsRevoking(null);
        }
    };

    return (
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-slate-200">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Access Management</h2>
                    <p className="text-slate-500 mt-1">Share your records or revoke access to previously shared files.</p>
                </div>
                <button
                    onClick={() => setIsGrantModalOpen(true)}
                    className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    <ShareIcon />
                    Grant New Access
                </button>
            </div>

            <h3 className="text-xl font-bold text-slate-700 mb-4">Current Permissions</h3>
            {isLoading ? (
                <div className="flex justify-center items-center h-48"><Spinner /></div>
            ) : grants.length === 0 ? (
                <p className="text-center text-slate-500 bg-slate-50 p-8 rounded-lg">You have not granted access to any professionals yet.</p>
            ) : (
                <div className="space-y-4">
                    {grants.map((grant) => (
                        <div key={grant.professionalAddress} className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div className="flex-1">
                                <p className="font-bold text-slate-800">{grant.professionalName}</p>
                                <p className="text-sm text-slate-600">{grant.hospitalName}</p>
                                <p className="text-xs text-slate-400 font-mono mt-1">{grant.professionalAddress}</p>
                                <p className="text-sm text-slate-500 mt-2">
                                    Access to <span className="font-semibold text-slate-700">{grant.recordIds.length}</span> record(s)
                                </p>
                            </div>
                            <button
                                onClick={() => handleRevoke(grant.professionalAddress, grant.recordIds)}
                                disabled={isRevoking === grant.professionalAddress}
                                className="mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:bg-slate-400"
                            >
                                {isRevoking === grant.professionalAddress ? <SpinnerWhite /> : <RevokeIcon />}
                                {isRevoking === grant.professionalAddress ? 'Revoking...' : 'Revoke Access'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isGrantModalOpen && <GrantAccessModal onClose={() => setIsGrantModalOpen(false)} onAccessGranted={fetchGrants} />}
        </div>
    );
}

// --- GRANT ACCESS MODAL ---
function GrantAccessModal({ onClose, onAccessGranted }) {
    const { keyPair, contract, records } = useWeb3();
    const [hospitals, setHospitals] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedProfessionalAddress, setSelectedProfessionalAddress] = useState('');
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/users/hospitals');
                if (response.data.success) setHospitals(response.data.data || []);
            } catch (error) { toast.error("Could not fetch hospitals."); }
        };
        fetchHospitals();
    }, []);

    useEffect(() => {
        if (selectedHospital) {
            const fetchProfessionals = async () => {
                setIsLoading(true);
                setProfessionals([]);
                setSelectedProfessionalAddress('');
                try {
                    const response = await axios.get(`http://localhost:3001/api/users/hospitals/${selectedHospital}/professionals`);
                    if (response.data.success) setProfessionals(response.data.data || []);
                } catch (error) { toast.error("Could not fetch professionals."); } finally { setIsLoading(false); }
            };
            fetchProfessionals();
        }
    }, [selectedHospital]);

    const handleRecordToggle = (recordId) => {
        setSelectedRecords(prev => prev.includes(recordId) ? prev.filter(id => id !== recordId) : [...prev, recordId]);
    };

    const handleGrantAccess = async () => {
        if (!selectedProfessionalAddress || selectedRecords.length === 0) {
            toast.error("Please select a professional and at least one record.");
            return;
        }
        if (!contract || !keyPair?.privateKey) {
            toast.error("Web3 provider or your private key is not available.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Encrypting record keys for secure sharing...");

        try {
            const professional = professionals.find(p => p.address === selectedProfessionalAddress);
            if (!professional?.publicKey) {
                throw new Error("Selected professional does not have a public key for encryption.");
            }

            const rewrappedKeys = await Promise.all(
                selectedRecords.map(async (recordId) => {
                    const record = records.find(r => r.recordId === recordId);
                    if (!record) throw new Error(`Record with ID ${recordId} not found.`);
                    
                    const metaResponse = await fetch(`https://ipfs.io/ipfs/${record.ipfsHash}`);
                    if (!metaResponse.ok) throw new Error(`Could not fetch metadata for record ${recordId}.`);
                    const metadata = await metaResponse.json();

                    const bundleResponse = await fetch(`https://ipfs.io/ipfs/${metadata.encryptedBundleIPFSHash}`);
                    if (!bundleResponse.ok) throw new Error(`Could not fetch encrypted bundle for record ${recordId}.`);
                    const encryptedBundle = await bundleResponse.json();

                    return await rewrapSymmetricKey(encryptedBundle, keyPair.privateKey, professional.publicKey);
                })
            );

            toast.loading("Sending transaction to the blockchain...", { id: toastId });
            const durationInDays = 30; // Default duration
            const tx = await contract.grantMultipleRecordAccess(selectedRecords, selectedProfessionalAddress, durationInDays, rewrappedKeys);
            await tx.wait();

            toast.success("Access granted successfully!", { id: toastId });
            onAccessGranted();
            onClose();

        } catch (error) {
            console.error("Granting access failed:", error);
            toast.error(error?.data?.message || error.message || "Failed to grant access.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-800">Grant Record Access</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><CloseIcon /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Step 1: Select Hospital */}
                    <div>
                        <label className="font-semibold text-slate-700 block mb-2">1. Select Hospital</label>
                        <select value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                            <option value="" disabled>-- Choose a hospital --</option>
                            {hospitals.map(h => <option key={h.hospitalId} value={h.hospitalId}>{h.name}</option>)}
                        </select>
                    </div>

                    {/* Step 2: Select Professional */}
                    {selectedHospital && (
                        <div>
                            <label className="font-semibold text-slate-700 block mb-2">2. Select Professional</label>
                            {isLoading ? <Spinner /> : (
                                <select value={selectedProfessionalAddress} onChange={(e) => setSelectedProfessionalAddress(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" disabled={professionals.length === 0}>
                                    <option value="" disabled>-- Choose a professional --</option>
                                    {professionals.map(p => <option key={p.address} value={p.address}>{p.name} ({p.role})</option>)}
                                </select>
                            )}
                            {professionals.length === 0 && !isLoading && <p className="text-sm text-slate-500 mt-2">No professionals found for this hospital.</p>}
                        </div>
                    )}

                    {/* Step 3: Select Records */}
                    {selectedProfessionalAddress && (
                        <div>
                            <label className="font-semibold text-slate-700 block mb-2">3. Select Records to Share</label>
                            <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3">
                                {records && records.length > 0 ? records.map(record => (
                                    <div key={record.recordId} className="flex items-center">
                                        <input type="checkbox" id={`record-${record.recordId}`} checked={selectedRecords.includes(record.recordId)} onChange={() => handleRecordToggle(record.recordId)} className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                                        <label htmlFor={`record-${record.recordId}`} className="ml-3 text-slate-700">{record.title}</label>
                                    </div>
                                )) : <p className="text-sm text-slate-500">You have no records to share.</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 mr-3">Cancel</button>
                    <button onClick={handleGrantAccess} disabled={!selectedProfessionalAddress || selectedRecords.length === 0 || isSubmitting} className="w-36 flex justify-center px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400">
                        {isSubmitting ? <SpinnerWhite /> : 'Grant Access'}
                    </button>
                </div>
            </div>
        </div>
    );
}

