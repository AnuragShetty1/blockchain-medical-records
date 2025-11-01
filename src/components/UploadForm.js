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
    const { contract, account, keyPair, userProfile, api } = useWeb3(); // <-- MODIFIED: Added api
    const [files, setFiles] = useState([]); // <-- MODIFIED: from file to files
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('lab-result');

    // --- MODIFIED: Handlers now add to array ---
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
    // ---

    const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
    const handleDragEnter = useCallback((e) => { handleDrag(e); setIsDragActive(true); }, [handleDrag]);
    const handleDragLeave = useCallback((e) => { handleDrag(e); setIsDragActive(false); }, [handleDrag]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // --- [THIS IS THE FIX] --- Removed `!title` from the validation
        if (files.length === 0 || !category) { 
            toast.error("Please provide at least one file and a category.");
            return;
        }
        if (!api || !keyPair || !userProfile?.publicKey) { // <-- MODIFIED: check for api
            toast.error("User session not fully loaded. Cannot encrypt.");
            return;
        }

        setIsUploading(true);
        const overallToastId = toast.loading(`Starting batch upload for ${files.length} file(s)...`);

        // --- [THIS IS THE FIX] ---
        // Changed from an object of arrays to a single array.
        const successfulUploads = [];

        // --- MODIFIED: Process files sequentially ---
        for (const [index, file] of files.entries()) {
            const fileToastId = toast.loading(`[${index + 1}/${files.length}] Processing ${file.name}...`);
            
            try {
                const fileBuffer = await file.arrayBuffer();
                const encryptedBundle = await hybridEncrypt(fileBuffer, [userProfile.publicKey]);

                toast.loading(`[${index + 1}/${files.length}] Uploading encrypted bundle for ${file.name}...`, { id: fileToastId });
                const encryptedBundleBlob = new Blob([JSON.stringify(encryptedBundle)], { type: 'application/json' });
                
                const formData = new FormData();
                formData.append("file", encryptedBundleBlob, `encrypted-${Date.now()}.json`);
                
                const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload encrypted bundle');
                const bundleHash = uploadData.ipfsHash;

                // --- [THIS IS THE FIX] ---
                // If title is provided, use "Batch Title - file.name", otherwise just use "file.name"
                const fileTitle = title ? `${title} - ${file.name}` : file.name;

                const metadata = {
                    title: fileTitle,
                    category: category,
                    fileType: file.type || 'application/octet-stream',
                    fileName: file.name,
                    encryptedBundleIPFSHash: bundleHash,
                };

                toast.loading(`[${index + 1}/${files.length}] Uploading metadata for ${file.name}...`, { id: fileToastId });
                const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
                const metadataFormData = new FormData();
                metadataFormData.append("file", metadataBlob, `metadata-${Date.now()}.json`);
                
                const metadataUploadResponse = await fetch('/api/upload', { method: 'POST', body: metadataFormData });
                const metadataUploadData = await metadataUploadResponse.json();
                if (!metadataUploadResponse.ok) throw new Error(metadataUploadData.error || 'Failed to upload metadata');
                const metadataHash = metadataUploadData.ipfsHash;
                
                // --- [THIS IS THE FIX] ---
                // Collect successful upload data as an object into the single array
                successfulUploads.push({
                    ipfsHash: metadataHash,
                    title: fileTitle,
                    category: category
                });

                toast.success(`[${index + 1}/${files.length}] Successfully processed ${file.name}!`, { id: fileToastId });

            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                toast.error(`[${index + 1}/${files.length}] Failed to process ${file.name}: ${error.message}`, { id: fileToastId });
                // Continue to the next file as per the plan
            }
        }

        // --- [THIS IS THE FIX] ---
        // Final batch API call now passes the array under the 'records' key
        if (successfulUploads.length > 0) {
            try {
                toast.loading(`Adding ${successfulUploads.length} record(s) to blockchain...`, { id: overallToastId });
                
                // Call the new batch API function, passing the object with the 'records' key
                await api.addSelfUploadedRecordsBatch({
                    records: successfulUploads
                });

                toast.success(`Successfully added ${successfulUploads.length} record(s)!`, { id: overallToastId });
                setFiles([]);
                setTitle('');
                setCategory('lab-result');

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
        <div className="w-full p-8 mb-8 bg-white rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-1">Upload New Secure Record(s)</h3>
            <p className="text-slate-500 mb-6">You can add multiple files to a single batch. Each file will be encrypted and processed sequentially.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        {/* --- [THIS IS THE FIX] --- Added (Optional) to label */}
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">Batch Title (Optional)</label>
                        {/* --- [THIS IS THE FIX] --- Removed `required` */}
                        <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Annual Blood Tests" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">Category (for all files)</label>
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
                    {/* --- MODIFIED: Show dropzone if files array is empty --- */}
                    {files.length === 0 ? (
                        <div onDrop={handleDrop} onDragOver={handleDrag} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} className={`relative block w-full px-12 py-10 text-center border-2 border-dashed rounded-lg cursor-pointer ${isDragActive ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-slate-400'} transition-colors`}>
                            <UploadCloudIcon />
                            <span className="mt-2 block text-sm font-semibold text-slate-900">Drag and drop files here</span>
                            <span className="mt-1 block text-xs text-slate-500">or click to browse</span>
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} multiple /> {/* <-- MODIFIED: Added multiple */}
                        </div>
                    ) : (
                        // --- MODIFIED: Show file list and "Add More" button ---
                        <div className="space-y-3">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileIcon />
                                        <span className="text-sm font-medium text-slate-800 truncate" title={file.name}>{file.name}</span>
                                    </div>
                                    <button type="button" onClick={() => removeFile(index)} className="p-1 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors flex-shrink-0"><CloseIcon /></button>
                                </div>
                            ))}
                            <label className="relative block w-full px-12 py-4 text-center border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-teal-500 hover:bg-teal-50 transition-colors">
                                <span className="text-sm font-semibold text-teal-700">Add More Files...</span>
                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} multiple />
                            </label>
                        </div>
                    )}
                </div>
                {/* --- [THIS IS THE FIX] --- Removed `!title` from disabled check */}
                <button type="submit" disabled={isUploading || files.length === 0} className="w-full px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 transition-colors shadow-lg">
                    {isUploading ? 'Processing Batch...' : `Encrypt & Upload ${files.length} Record(s)`}
                </button>
            </form>
        </div>
    );
}
