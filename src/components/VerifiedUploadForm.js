"use client";

import { useState, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import { hybridEncrypt } from '@/utils/crypto';
import { UploadCloud, File as FileIcon, X as CloseIcon, Loader2 } from 'lucide-react';

export default function VerifiedUploadForm({ patientProfile, onUploadSuccess, allowedCategories }) {
    const { api, userProfile: professionalProfile } = useWeb3();
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(allowedCategories[0]?.value || 'other');

    const handleDrop = useCallback((e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        setIsDragActive(false); 
        if (e.dataTransfer.files?.length) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        } 
    }, []);

    const handleChange = (e) => { 
        if (e.target.files?.length) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
    const handleDragEnter = useCallback((e) => { handleDrag(e); setIsDragActive(true); }, [handleDrag]);
    const handleDragLeave = useCallback((e) => { handleDrag(e); setIsDragActive(false); }, [handleDrag]);

    const resetForm = () => {
        setFiles([]);
        setTitle('');
        setCategory(allowedCategories[0]?.value || 'other');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // --- MODIFIED: Title is no longer required here ---
        if (files.length === 0 || !category) {
            return toast.error("Please provide at least one file and a category.");
        }
        if (!api || !professionalProfile?.publicKey || !patientProfile?.publicKey) {
            return toast.error("User profiles not fully loaded. Cannot encrypt.");
        }
        
        setIsUploading(true);
        const overallToastId = toast.loading(`Starting batch upload for ${files.length} file(s)...`);

        // --- MODIFIED: This is the format the backend (users.js) expects ---
        const records = [];

        for (const [index, file] of files.entries()) {
            const fileToastId = toast.loading(`[${index + 1}/${files.length}] Processing ${file.name}...`);

            try {
                const fileBuffer = await file.arrayBuffer();
                const recipientPublicKeys = [patientProfile.publicKey, professionalProfile.publicKey];
                const encryptedBundle = await hybridEncrypt(fileBuffer, recipientPublicKeys);

                toast.loading(`[${index + 1}/${files.length}] Uploading encrypted file for ${file.name}...`, { id: fileToastId });
                const encryptedBundleBlob = new Blob([JSON.stringify(encryptedBundle)], { type: 'application/json' });
                const formData = new FormData();
                formData.append("file", encryptedBundleBlob, `encrypted-${Date.now()}.json`);
                const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload encrypted file');
                const bundleHash = uploadData.ipfsHash;

                // --- MODIFIED: Use file.name as fallback if title is empty ---
                const fileTitle = title.trim() ? `${title.trim()} - ${file.name}` : file.name;
                
                const metadata = { 
                    title: fileTitle, 
                    category, 
                    fileType: file.type || 'application/octet-stream', 
                    fileName: file.name, 
                    encryptedBundleIPFSHash: bundleHash 
                };
                
                toast.loading(`[${index + 1}/${files.length}] Uploading metadata for ${file.name}...`, { id: fileToastId });
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
                    throw new Error("Encryption key bundling failed.");
                }

                // --- MODIFIED: Push an object to the 'records' array ---
                records.push({
                    ipfsHash: metadataHash,
                    title: fileTitle,
                    category: category,
                    encryptedKeyForPatient: JSON.stringify(patientKeyBundle),
                    encryptedKeyForHospital: JSON.stringify(professionalKeyBundle)
                });

                toast.success(`[${index + 1}/${files.length}] Successfully processed ${file.name}!`, { id: fileToastId });

            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                toast.error(`[${index + 1}/${files.length}] Failed to process ${file.name}: ${error.message}`, { id: fileToastId });
            }
        }

        // --- MODIFIED: Check length of 'records' array ---
        if (records.length > 0) {
            try {
                toast.loading(`Adding ${records.length} verified record(s) to blockchain...`, { id: overallToastId });
                
                // --- MODIFIED: Send the object in the format the backend (users.js) expects ---
                await api.addVerifiedRecordsBatch({
                    patient: patientProfile.walletAddress, // Key is 'patient'
                    records: records                       // Key is 'records'
                });

                toast.success(`Successfully added ${records.length} verified record(s)!`, { id: overallToastId });
                resetForm();
                if (onUploadSuccess) onUploadSuccess();
            
            } catch (error) {
                console.error("Batch submit failed:", error);
                toast.error(`Batch submission failed: ${error.message || "An error occurred."}`, { id: overallToastId });
            }
        } else {
            toast.error("No files were processed successfully.", { id: overallToastId });
        }

        setIsUploading(false);
    };

    return (
        <div className="bg-white p-6 border border-slate-200 rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-600 border-b border-slate-200 pb-2 mb-4 w-full">1. Record Details</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            {/* --- MODIFIED: Title is now optional --- */}
                            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">Batch Title (Optional)</label>
                            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Patient X-Rays (Prefix)" className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1.5">Category (for all files)</label>
                            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white">
                                {allowedCategories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-sm font-semibold text-slate-600 border-b border-slate-200 pb-2 mb-4 w-full">2. Attach File(s)</legend>
                    {files.length === 0 ? (
                        <div onDrop={handleDrop} onDragOver={handleDrag} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} className={`relative block w-full px-6 py-8 text-center border-2 border-dashed rounded-lg cursor-pointer ${isDragActive ? 'border-sky-500 bg-sky-50/50' : 'border-slate-300 hover:border-slate-400'} transition-colors`}>
                            <UploadCloud className="w-10 h-10 mx-auto text-slate-400" />
                            <span className="mt-2 block text-sm font-medium text-slate-700">Drag & drop files or <span className="text-sky-600 font-semibold">browse</span></span>
                            <span className="mt-1 block text-xs text-slate-500">Add multiple files for a batch upload</span>
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} multiple />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileIcon className="h-6 w-6 text-slate-500 flex-shrink-0" />
                                        <div className='min-w-0'>
                                             <p className="text-sm font-medium text-slate-800 truncate" title={file.name}>{file.name}</p>
                                             <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeFile(index)} className="p-1.5 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors flex-shrink-0"><CloseIcon className="h-5 w-5"/></button>
                                </div>
                            ))}
                            <label className="relative block w-full px-6 py-3 text-center border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-sky-500 hover:bg-sky-50/50 transition-colors">
                                <span className="text-sm font-semibold text-sky-700">Add More Files...</span>
                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} multiple />
                            </label>
                        </div>
                    )}
                </fieldset>

                <div className="pt-4">
                    {/* --- MODIFIED: Button disabled check no longer includes title --- */}
                    <button type="submit" disabled={isUploading || files.length === 0} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm">
                        {isUploading ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing Batch...</> : <>Encrypt & Upload {files.length} Record(s)</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

