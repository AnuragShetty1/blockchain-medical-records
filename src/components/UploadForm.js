"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import axios from 'axios';

export default function UploadForm() {
    // Get the functions and data we need from our context
    const { contract, account, checkUserRegistration } = useWeb3();
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setMessage(''); // Clear previous messages when a new file is selected
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !contract || !account) {
            setMessage("Please select a file and ensure your wallet is connected.");
            return;
        };

        setIsLoading(true);
        setMessage('1/2: Uploading file to IPFS...');

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Step 1: Upload file to IPFS via our own backend
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const ipfsHash = res.data.ipfsHash;
            setMessage(`2/2: File uploaded. Please confirm the transaction to add the record to the blockchain.`);

            // Step 2: Add record to the blockchain
            const tx = await contract.addRecord(ipfsHash);
            await tx.wait();

            setMessage('Transaction successful! Refreshing your record list...');

            // Step 3: This is the crucial new step!
            // Refresh the user's state, which will re-fetch the record list.
            await checkUserRegistration(account, contract);

            setMessage('Your records are now up to date.');
            setFile(null); // Clear the file input
            // Clear the success message after a few seconds
            setTimeout(() => setMessage(''), 5000); 

        } catch (error) {
            console.error("Upload failed:", error);
            setMessage('Upload failed. The transaction may have been rejected.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Upload New Medical Record</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
                <button
                    type="submit"
                    disabled={!file || isLoading}
                    className="w-full px-4 py-2 font-bold text-white bg-teal-500 rounded-md hover:bg-teal-600 disabled:bg-gray-400"
                >
                    {isLoading ? 'Processing...' : 'Upload and Add Record'}
                </button>
            </form>
            {message && <p className="mt-4 text-sm text-center text-gray-600 break-words">{message}</p>}
        </div>
    );
}
