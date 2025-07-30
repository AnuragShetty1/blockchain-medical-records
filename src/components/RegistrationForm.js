"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

export default function RegistrationForm() {
    const { contract, account, checkUserRegistration } = useWeb3(); 
    const [name, setName] = useState('');
    const [role, setRole] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!contract || !account) {
            toast.error('Please connect your wallet first.');
            return;
        }
        if (!name) {
            toast.error('Please enter your name.');
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading('Submitting registration transaction...');

        try {
            const tx = await contract.registerUser(name, role);
            await tx.wait();
            toast.success('Registration successful! Updating your status...', { id: toastId });
            await checkUserRegistration(account, contract);
        } catch (error) {
            console.error("Registration failed:", error);
            toast.error("Registration failed. The address may already be registered.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center text-gray-900">Register</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                </div>
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                    <select id="role" value={role} onChange={(e) => setRole(Number(e.target.value))} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                        <option value={0}>Patient</option>
                        <option value={1}>Doctor</option>
                        <option value={3}>Insurance Provider</option>
                        <option value={4}>Pharmacist</option>
                        <option value={5}>Researcher</option>
                        <option value={6}>Guardian</option>
                    </select>
                </div>
                <div>
                    <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-bold text-white bg-teal-500 rounded-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-gray-400">
                        {isLoading ? 'Processing...' : 'Register'}
                    </button>
                </div>
            </form>
        </div>
    );
}
