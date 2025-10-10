"use client";

import { useState, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import { hybridEncrypt } from '@/utils/crypto';

// --- SVG Icons (unchanged) ---
const UploadCloudIcon = () => <svg className="w-12 h-12 mx-auto text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>;
const FileIcon = () => <svg className="w-6 h-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const CloseIcon = () => <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;


export default function UploadForm() {
    const { contract, account, keyPair, userProfile } = useWeb3();
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('lab-result');

    const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) { setFile(e.dataTransfer.files[0]); } }, []);
    const handleChange = (e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); } };
    const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
    const handleDragEnter = useCallback((e) => { handleDrag(e); setIsDragActive(true); }, [handleDrag]);
    const handleDragLeave = useCallback((e) => { handleDrag(e); setIsDragActive(false); }, [handleDrag]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !description || !category) {
            toast.error("Please provide a file, description, and category.");
            return;
        }
        if (!contract || !keyPair || !userProfile?.publicKey) {
            toast.error("User session not fully loaded. Cannot encrypt.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Encrypting file with your public key...");

        try {
            const fileBuffer = await file.arrayBuffer();
            const encryptedBundle = await hybridEncrypt(fileBuffer, [userProfile.publicKey]);

            toast.loading("Uploading encrypted bundle to IPFS...", { id: toastId });
            const encryptedBundleBlob = new Blob([JSON.stringify(encryptedBundle)], { type: 'application/json' });
            
            const formData = new FormData();
            formData.append("file", encryptedBundleBlob, `encrypted-${Date.now()}.json`);
            
            const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload encrypted bundle');
            const bundleHash = uploadData.ipfsHash;

            const metadata = {
                description: description,
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
            
            toast.loading("Adding record to blockchain...", { id: toastId });
            const tx = await contract.addSelfUploadedRecord(metadataHash, category);
            await tx.wait();

            toast.success("Record added successfully!", { id: toastId });
            setFile(null);
            setDescription('');
            setCategory('lab-result');
            // REMOVED: The unreliable manual refresh call. The event listener in Web3Context will now handle this.

        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(error.message || "An error occurred during upload.", { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full p-8 mb-8 bg-white rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-1">Upload New Secure Record</h3>
            <p className="text-slate-500 mb-6">Your file will be encrypted in your browser before being uploaded.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">Record Description</label>
                        <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Annual Blood Test Results" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" required />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                            <option value="lab-result">Lab Result</option>
                            <option value="prescription">Prescription</option>
                            <option value="doctor-note">Doctor's Note</option>
                            <option value="insurance-claim">Insurance Claim</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
                <div>
                    {!file ? (
                        <div onDrop={handleDrop} onDragOver={handleDrag} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} className={`relative block w-full px-12 py-10 text-center border-2 border-dashed rounded-lg cursor-pointer ${isDragActive ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-slate-400'} transition-colors`}>
                            <UploadCloudIcon />
                            <span className="mt-2 block text-sm font-semibold text-slate-900">Drag and drop file here</span>
                            <span className="mt-1 block text-xs text-slate-500">or click to browse</span>
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-3"><FileIcon /> <span className="text-sm font-medium text-slate-800">{file.name}</span></div>
                            <button type="button" onClick={() => setFile(null)} className="p-1 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"><CloseIcon /></button>
                        </div>
                    )}
                </div>
                <button type="submit" disabled={isUploading || !file || !description} className="w-full px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 transition-colors shadow-lg">
                    {isUploading ? 'Processing...' : 'Encrypt & Upload Record'}
                </button>
            </form>
        </div>
    );
}

