/*
 * File: src/components/Profile.js
 * [MODIFIED]
 * - Removed all functionality related to uploading and displaying a profile picture
 * to simplify the component. It now only handles name and contact info.
 */
"use client";

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

// --- SVG Icons ---
const UserCircleIcon = () => <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const AtSymbolIcon = () => <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" /></svg>;

export default function Profile({ onProfileUpdate }) {
    const { contract, account, userProfile } = useWeb3();
    const [formData, setFormData] = useState({
        name: '',
        contactInfo: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setFormData({
                name: userProfile.name || '',
                contactInfo: userProfile.contactInfo || '',
            });
        }
    }, [userProfile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!contract || !account) return toast.error("Please connect your wallet first.");
        if (!formData.name) return toast.error("Name is a required field.");

        setIsLoading(true);
        const toastId = toast.loading("Updating your profile...");

        try {
            // Call the smart contract, passing an empty string for the profile picture URI
            const tx = await contract.updateUserProfile(
                formData.name,
                formData.contactInfo,
                "" // Pass an empty string for the removed profile picture
            );
            await tx.wait();
            toast.success("Profile updated successfully!", { id: toastId });
            
            if (onProfileUpdate) {
                await onProfileUpdate();
            }
        } catch (error) {
            console.error("Profile update failed:", error);
            toast.error("Failed to update profile on blockchain.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex flex-col items-center space-y-4">
                 <h2 className="text-3xl font-bold text-slate-900">Edit Your Profile</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                        <UserCircleIcon />
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="e.g., Jane Doe" required />
                    </div>
                </div>

                <div>
                    <label htmlFor="contactInfo" className="block text-sm font-medium text-slate-700 mb-1">Contact Info (Email)</label>
                    <div className="relative">
                        <AtSymbolIcon />
                        <input id="contactInfo" name="contactInfo" type="text" value={formData.contactInfo} onChange={handleChange} className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="e.g., jane.doe@example.com" />
                    </div>
                </div>
                
                <button type="submit" disabled={isLoading} className="w-full px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 transition-colors shadow-lg">
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
}

