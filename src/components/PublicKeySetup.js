"use client";

import React from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { ShieldCheck } from 'lucide-react';

const PublicKeySetup = () => {
    const { savePublicKeyOnChain, userProfile } = useWeb3();

    const handleSaveKey = async () => {
        // The context already has the keypair loaded, just need to trigger the save.
        await savePublicKeyOnChain();
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
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105"
                >
                    Secure My Account & Save Key
                </button>
                <p className="text-xs text-gray-500 mt-4">
                    This is a blockchain transaction and will require a small amount of gas.
                </p>
            </div>
        </div>
    );
};

export default PublicKeySetup;
