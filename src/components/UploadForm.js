"use client";

import { useState, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

// --- SVG Icons ---
const UploadCloudIcon = () => <svg className="w-12 h-12 mx-auto text-slate-400" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>;
const FileIcon = () => <svg className="w-6 h-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const CloseIcon = () => <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;


/**
 * A modern, user-friendly form for uploading medical records.
 * Features a drag-and-drop zone and file preview, consistent with the patient dashboard's design.
 */
export default function UploadForm() {
    const { contract, checkUserRegistration, account } = useWeb3();
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);

    // Handle file drop event
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    }, []);

    // Handle file selection via browse
    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    // Prevent default browser behavior for drag events
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragEnter = useCallback((e) => {
        handleDrag(e);
        setIsDragActive(true);
    }, [handleDrag]);

    const handleDragLeave = useCallback((e) => {
        handleDrag(e);
        setIsDragActive(false);
    }, [handleDrag]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error("Please select a file to upload.");
            return;
        }
        setIsUploading(true);
        const toastId = toast.loading("Uploading file to IPFS...");

        try {
            // Step 1: Upload file to IPFS via our Next.js API route
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload to IPFS');
            }
            
            const ipfsHash = data.ipfsHash;
            toast.loading("File uploaded. Adding record to blockchain...", { id: toastId });

            // Step 2: Add the record to the blockchain (with only one argument)
            const tx = await contract.addRecord(ipfsHash);
            await tx.wait();

            toast.success("Record added successfully!", { id: toastId });

            // Reset form and refresh user data
            setFile(null);
            if (account && contract) {
                await checkUserRegistration(account, contract);
            }

        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(error.message || "An error occurred during upload.", { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full p-8 mb-8 bg-white rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-1">Upload New Record</h3>
            <p className="text-slate-500 mb-6">Add a new medical document to your secure, on-chain history.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Input / Drop Zone */}
                <div>
                    {!file ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDrag}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            className={`relative block w-full px-12 py-10 text-center border-2 border-dashed rounded-lg cursor-pointer
                                ${isDragActive ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-slate-400'} transition-colors`}
                        >
                            <UploadCloudIcon />
                            <span className="mt-2 block text-sm font-semibold text-slate-900">
                                Drag and drop file here
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                                or click to browse
                            </span>
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} />
                        </div>
                    ) : (
                        // File Preview
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileIcon />
                                <span className="text-sm font-medium text-slate-800">{file.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFile(null)}
                                className="p-1 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isUploading || !file}
                    className="w-full px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 transition-colors shadow-lg"
                >
                    {isUploading ? 'Uploading...' : 'Upload and Add Record'}
                </button>
            </form>
        </div>
    );
}
