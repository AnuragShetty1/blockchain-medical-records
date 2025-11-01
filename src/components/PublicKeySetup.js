"use client";

import React from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast'; // Import toast for local component error/loading handling

const PublicKeySetup = () => {
    // [MODIFIED] Destructure 'api' instead of 'savePublicKeyOnChain'
    const { api, userProfile, generateAndSetKeyPair, keyPair, refetchUserProfile } = useWeb3();
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSaveKey = async () => {
        setIsLoading(true);
        const toastId = toast.loading("Securing account...");
        try {
            let keysToSave = keyPair;

            // If keys aren't in state (or are incomplete), generate them.
            // This function handles the user's signature.
            if (!keysToSave || !keysToSave.publicKey || !keysToSave.signature) {
                toast.loading("Generating encryption keys... Please sign the message in your wallet.", { id: toastId });
                keysToSave = await generateAndSetKeyPair();
                
                if (!keysToSave || !keysToSave.publicKey || !keysToSave.signature) {
                    throw new Error("Key generation failed or was cancelled.");
                }
            }

            // [MODIFIED] Call the new sponsored API endpoint with the public key and signature
            toast.loading("Saving your public key to the blockchain...", { id: toastId });
            await api.savePublicKey(keysToSave.publicKey, keysToSave.signature);

            // The context's 'handlePublicKeySaved' event listener will catch this,
            // call refetchUserProfile(), and hide this component.
            toast.success("Security setup complete!", { id: toastId });
            
            // We call refetchUserProfile() here just in case the event listener is slow,
            // this ensures the UI updates immediately.
            await refetchUserProfile();

        } catch (error) {
            // Display error if anything fails
            toast.error(error.message || "Failed to complete security setup.", { id: toastId });
            console.error("Setup failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-lg border border-gray-700 max-w-lg mx-auto">
                <ShieldCheck className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">One-Time Security Setup</h2>
                <p className="text-gray-300 mb-6">
                    Welcome, {userProfile?.name}! To secure your account and enable end-to-end encryption for your records, we need to save your generated public key to the blockchain. This is a one-time action.
                </p>
                <button
                    onClick={handleSaveKey}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:cursor-wait"
                >
                    {isLoading ? 'Processing...' : 'Secure My Account & Save Key'}
                </button>
                <p className="text-xs text-gray-500 mt-4">
                    {/* [MODIFIED] Updated text to reflect gas-less model */}
                    This is a sponsored blockchain transaction. You do not need to pay any gas fees.
                </p>
            </div>
        </div>
    );
};

export default PublicKeySetup;
