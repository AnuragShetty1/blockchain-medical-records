"use client";

import { useState, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import { hybridEncrypt } from '@/utils/crypto';

// --- SVG Icons ---
const UploadCloudIcon = () => <svg className="w-10 h-10 mx-auto text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>;
const FileIcon = () => <svg className="w-5 h-5 text-slate-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const CloseIcon = () => <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const UploadSubmitIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const ButtonSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>;


export default function VerifiedUploadForm({ patientProfile, onUploadSuccess, allowedCategories }) {
    const { contract, userProfile: professionalProfile } = useWeb3();
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(allowedCategories[0]?.value || 'other');

    const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) { setFile(e.dataTransfer.files[0]); } }, []);
    const handleChange = (e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); } };
    const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
    const handleDragEnter = useCallback((e) => { handleDrag(e); setIsDragActive(true); }, [handleDrag]);
    const handleDragLeave = useCallback((e) => { handleDrag(e); setIsDragActive(false); }, [handleDrag]);

    const resetForm = () => {
        setFile(null);
        setTitle('');
        setCategory(allowedCategories[0]?.value || 'other');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !title || !category) {
            toast.error("Please provide a file, title, and category.");
            return;
        }
        if (!contract || !professionalProfile?.publicKey || !patientProfile?.publicKey) {
            toast.error("User profiles not fully loaded. Cannot encrypt.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Encrypting file for patient and self...");

        try {
            const fileBuffer = await file.arrayBuffer();
            const recipientPublicKeys = [patientProfile.publicKey, professionalProfile.publicKey];
            const encryptedBundle = await hybridEncrypt(fileBuffer, recipientPublicKeys);

            toast.loading("Uploading encrypted bundle to IPFS...", { id: toastId });
            const encryptedBundleBlob = new Blob([JSON.stringify(encryptedBundle)], { type: 'application/json' });
            
            const formData = new FormData();
            formData.append("file", encryptedBundleBlob, `encrypted-${Date.now()}.json`);
            
            const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload encrypted bundle');
            const bundleHash = uploadData.ipfsHash;

            const metadata = {
                title: title,
                category: category,
                fileType: file.type || 'application/octet-stream',
                fileName: file.name,
                encryptedBundleIPFSHash: bundleHash,
            };

            toast.loading("Uploading metadata to IPFS...", { id: toastId });
            const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
            const metadataFormData = new FormData();
            metadataFormData.append("file", metadataBlob, `metadata-${Date.now()}.json`);
            
            const metadataUploadResponse = await fetch('/api/upload', { method: 'POST', body: metadataFormData });
            const metadataUploadData = await metadataUploadResponse.json();
            if (!metadataUploadResponse.ok) throw new Error(metadataUploadData.error || 'Failed to upload metadata');
            const metadataHash = metadataUploadData.ipfsHash;
            
            const patientKeyBundle = encryptedBundle.encryptedSymmetricKeys[patientProfile.publicKey];
            const professionalKeyBundle = encryptedBundle.encryptedSymmetricKeys[professionalProfile.publicKey];

            if (!patientKeyBundle || !professionalKeyBundle) {
                throw new Error("Encryption failed: Could not create encrypted keys for recipients.");
            }
            
            const patientKeyBytes = new TextEncoder().encode(JSON.stringify(patientKeyBundle));
            const professionalKeyBytes = new TextEncoder().encode(JSON.stringify(professionalKeyBundle));

            toast.loading("Adding verified record to blockchain...", { id: toastId });
            
            const tx = await contract.addVerifiedRecord(
                patientProfile.walletAddress, 
                metadataHash, 
                title, 
                category,
                patientKeyBytes,
                professionalKeyBytes
            );
            await tx.wait();

            toast.success("Verified record added successfully!", { id: toastId });
            resetForm();
            if (onUploadSuccess) onUploadSuccess();

        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(error.message || "An error occurred during upload.", { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
         <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset>
                    <legend className="text-sm font-semibold leading-6 text-slate-600 border-b border-slate-200 pb-2 mb-4 w-full">1. Record Details</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">Record Title</label>
                            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Annual Blood Test Results" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500" required />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white">
                                {allowedCategories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-sm font-semibold leading-6 text-slate-600 border-b border-slate-200 pb-2 mb-4 w-full">2. Attach File</legend>
                    {!file ? (
                        <div onDrop={handleDrop} onDragOver={handleDrag} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} className={`relative block w-full px-6 py-8 text-center border-2 border-dashed rounded-lg cursor-pointer ${isDragActive ? 'border-teal-500 bg-teal-50/50' : 'border-slate-300 hover:border-slate-400'} transition-colors`}>
                            <UploadCloudIcon />
                            <span className="mt-2 block text-sm font-medium text-slate-700">Drag & drop or <span className="text-teal-600 font-semibold">browse</span></span>
                            <span className="mt-1 block text-xs text-slate-500">Maximum file size: 10MB</span>
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
                            <div className="flex items-center gap-3 min-w-0">
                                <FileIcon /> 
                                <span className="text-sm font-medium text-slate-800 truncate">{file.name}</span>
                            </div>
                            <button type="button" onClick={() => setFile(null)} className="p-1.5 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors flex-shrink-0"><CloseIcon /></button>
                        </div>
                    )}
                </fieldset>

                <div className="pt-4">
                    <button type="submit" disabled={isUploading || !file || !title} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm">
                        {isUploading ? <><ButtonSpinner /> Processing...</> : <><UploadSubmitIcon /> Encrypt & Upload Record</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

