"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';

export default function RegistrationForm() {
    // We now need the 'account' and 'checkUserRegistration' function from our context
    const { contract, account, checkUserRegistration } = useWeb3(); 
    const [name, setName] = useState('');
    const [role, setRole] = useState(0); // Default to Patient (enum value 0)
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!contract || !account) {
            setMessage('Please connect your wallet first.');
            return;
        }
        if (!name) {
            setMessage('Please enter your name.');
            return;
        }

        setIsLoading(true);
        setMessage('Please confirm the transaction in your wallet...');

        try {
            const tx = await contract.registerUser(name, role);

            setMessage('Processing transaction... please wait.');
            await tx.wait(); // Wait for the transaction to be mined

            setMessage('Registration successful! Updating your status...');

            // This is the crucial new step!
            // After the transaction is successful, we re-check the user's status.
            // This will update the global state and cause the UI to switch to the Dashboard.
            await checkUserRegistration(account, contract);

        } catch (error) {
            console.error("Registration failed:", error);
            if (error.data === "0x3a81d6fc" || (error.message && error.message.includes("AlreadyRegistered"))) {
                setMessage("This wallet address is already registered.");
            } else {
                setMessage("Registration failed. The transaction may have been rejected.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center text-gray-900">Register</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Role
                    </label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(Number(e.target.value))}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value={0}>Patient</option>
                        <option value={1}>Doctor</option>
                        <option value={2}>Hospital Admin</option>
                        <option value={3}>Insurance Provider</option>
                        <option value={4}>Pharmacist</option>
                        <option value={5}>Researcher</option>
                        <option value={6}>Guardian</option>
                    </select>
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-4 py-2 font-bold text-white bg-teal-500 rounded-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-gray-400"
                    >
                        {isLoading ? 'Processing...' : 'Register'}
                    </button>
                </div>
            </form>
            {message && <p className="mt-4 text-sm text-center text-gray-600 break-words">{message}</p>}
        </div>
    );
}
