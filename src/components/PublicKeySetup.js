"use client";

import React from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast'; // Import toast for local component error/loading handling

const PublicKeySetup = () => {
    // [CHANGE] Destructure generateAndSetKeyPair and keyPair, and add local loading state
    const { savePublicKeyOnChain, userProfile, generateAndSetKeyPair, keyPair } = useWeb3();
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSaveKey = async () => {
        setIsLoading(true);
        try {
            // [FIX] If keys are not in memory, generate them first (which includes wallet signature)
            if (!keyPair || !keyPair.privateKey) {
                const generated = await generateAndSetKeyPair();
                if (!generated) throw new Error("Key generation failed or was cancelled.");
            }

            // Now trigger the save. The context will handle the state refresh upon success.
            await savePublicKeyOnChain();
        } catch (error) {
            // Display error if anything fails during generation or saving
            toast.error(error.message || "Failed to complete security setup.");
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
                    This is a blockchain transaction and will require a small amount of gas.
                </p>
            </div>
        </div>
    );
};

export default PublicKeySetup;
