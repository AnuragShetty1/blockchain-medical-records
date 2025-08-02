/*
 * File: src/components/Profile.js
 * [MODIFIED]
 * This component is updated to handle profile picture uploads.
 * - It now includes a file input and shows an image preview.
 * - When saving, it first uploads the new image to our API (which uses IPFS/Pinata).
 * - It then saves the returned IPFS link (hash) to the user's on-chain profile.
 */
"use client";

import { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import Image from 'next/image'; // Using Next.js Image for optimization

// --- SVG Icons ---
const UserCircleIcon = () => <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const AtSymbolIcon = () => <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" /></svg>;
const CameraIcon = () => <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008v-.008z" /></svg>;


export default function Profile() {
    const { contract, account, userProfile, checkUserRegistration } = useWeb3();
    const [formData, setFormData] = useState({
        name: '',
        contactInfo: '',
        profileMetadataURI: '' // This will now hold the IPFS hash for the image
    });
    const [selectedImage, setSelectedImage] = useState(null); // To hold the image file
    const [previewUrl, setPreviewUrl] = useState(null); // To show a preview of the selected image
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null); // To trigger the file input dialog

    // Populate the form when the component loads or the user profile data changes
    useEffect(() => {
        if (userProfile) {
            setFormData({
                name: userProfile.name || '',
                contactInfo: userProfile.contactInfo || '',
                profileMetadataURI: userProfile.profileMetadataURI || ''
            });
            // If the user already has a profile picture, set it as the preview
            if (userProfile.profileMetadataURI) {
                setPreviewUrl(`https://gateway.pinata.cloud/ipfs/${userProfile.profileMetadataURI}`);
            }
        }
    }, [userProfile]);

    // Handle the user selecting a new image file
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

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

        let ipfsHash = formData.profileMetadataURI; // Start with the existing hash

        // Step 1: If a new image was selected, upload it first.
        if (selectedImage) {
            try {
                toast.loading("Uploading image to secure storage...", { id: toastId });
                const fileFormData = new FormData();
                fileFormData.append("file", selectedImage);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: fileFormData,
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || 'Image upload failed');
                }
                ipfsHash = result.ipfsHash; // Get the new hash from the API response
                toast.loading("Image uploaded. Saving profile to blockchain...", { id: toastId });
            } catch (error) {
                console.error("Image upload failed:", error);
                toast.error(`Image upload failed: ${error.message}`, { id: toastId });
                setIsLoading(false);
                return;
            }
        }

        // Step 2: Call the smart contract to update the profile with the new data (and new image hash if any)
        try {
            const tx = await contract.updateUserProfile(
                formData.name,
                formData.contactInfo,
                ipfsHash // Use the potentially new hash
            );
            await tx.wait();
            toast.success("Profile updated successfully!", { id: toastId });
            
            // Refresh the user profile data in the context to show the changes immediately
            await checkUserRegistration(account, contract);
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
                {/* Profile Picture Display and Upload Trigger */}
                <div className="relative">
                    <Image
                        src={previewUrl || '/default-avatar.svg'} // Fallback to a default image
                        alt="Profile Picture"
                        width={128}
                        height={128}
                        className="rounded-full object-cover w-32 h-32 border-4 border-slate-200 shadow-md"
                        onError={(e) => { e.target.onerror = null; e.target.src='/default-avatar.svg'; }} // Handle broken image links
                    />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 transition-colors shadow-md border-2 border-white"
                        aria-label="Upload new profile picture"
                    >
                        <CameraIcon />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif"
                    />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Edit Your Profile</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                        <UserCircleIcon />
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="e.g., Jane Doe" required />
                    </div>
                </div>

                {/* Contact Info Field */}
                <div>
                    <label htmlFor="contactInfo" className="block text-sm font-medium text-slate-700 mb-1">Contact Info (Email, Phone, etc.)</label>
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
