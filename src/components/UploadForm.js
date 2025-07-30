"use client";
import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function UploadForm() {
    const { contract, account, checkUserRegistration } = useWeb3();
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !contract || !account) {
            toast.error("Please select a file and ensure your wallet is connected.");
            return;
        }
        setIsLoading(true);
        const toastId = toast.loading('1/2: Uploading file to IPFS...');
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await axios.post('/api/upload', formData);
            const ipfsHash = res.data.ipfsHash;
            toast.loading(`2/2: Adding record to blockchain...`, { id: toastId });
            const tx = await contract.addRecord(ipfsHash);
            await tx.wait();
            toast.success('Record successfully added! Refreshing list...', { id: toastId });
            await checkUserRegistration(account, contract); // Refresh the user's data
            setFile(null);
            e.target.reset(); // Reset the form to clear the file input
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error('Upload failed. Please try again.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Upload New Medical Record</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="file" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                <button type="submit" disabled={!file || isLoading} className="w-full px-4 py-2 font-bold text-white bg-teal-500 rounded-md hover:bg-teal-600 disabled:bg-gray-400">
                    {isLoading ? 'Processing...' : 'Upload and Add Record'}
                </button>
            </form>
        </div>
    );
}
