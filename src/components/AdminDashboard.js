"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';

export default function AdminDashboard() {
    const { contract } = useWeb3();
    const [addressToVerify, setAddressToVerify] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!addressToVerify || !contract) {
            setMessage("Please enter a wallet address.");
            return;
        }

        setIsLoading(true);
        setMessage("Submitting verification transaction...");

        try {
            const tx = await contract.verifyUser(addressToVerify);
            await tx.wait();
            setMessage(`Successfully verified user: ${addressToVerify}`);
            setAddressToVerify(''); // Clear input on success
        } catch (error) {
            console.error("Verification failed:", error);
            setMessage("Verification failed. Check console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Admin Dashboard</h2>
            <form onSubmit={handleVerify} className="space-y-4">
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        User Address to Verify
                    </label>
                    <input
                        id="address"
                        type="text"
                        value={addressToVerify}
                        onChange={(e) => setAddressToVerify(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isLoading ? 'Processing...' : 'Verify User'}
                </button>
            </form>
            {message && <p className="mt-4 text-sm text-center text-gray-600 break-words">{message}</p>}
        </div>
    );
}
