"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';

export default function AccessControl() {
    const { contract, account } = useWeb3(); // Get current user's account
    const [doctorAddress, setDoctorAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleGrant = async () => {
        if (!doctorAddress || !contract || !account) return;
        setIsLoading(true);
        setMessage(`Granting access to ${doctorAddress}...`);
        try {
            const tx = await contract.grantAccess(doctorAddress);
            await tx.wait();
            setMessage(`Transaction successful! Verifying access on-chain...`);

            // NEW DEBUGGING STEP: Immediately check if access was granted
            const hasAccess = await contract.checkAccess(account, doctorAddress);
            console.log(`DEBUG: On-chain access for ${doctorAddress} is: ${hasAccess}`);

            if (hasAccess) {
                setMessage(`Successfully granted access to ${doctorAddress}`);
            } else {
                setMessage(`Transaction succeeded, but access is NOT granted. Check contract logic.`);
            }

        } catch (error) {
            console.error("Failed to grant access:", error);
            setMessage("Failed to grant access. Is it a verified doctor's address?");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevoke = async () => {
        if (!doctorAddress || !contract) return;
        setIsLoading(true);
        setMessage(`Revoking access from ${doctorAddress}...`);
        try {
            const tx = await contract.revokeAccess(doctorAddress);
            await tx.wait();
            setMessage(`Successfully revoked access for ${doctorAddress}`);
        } catch (error) {
            console.error("Failed to revoke access:", error);
            setMessage("Failed to revoke access. Do they have access currently?");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Manage Doctor Access</h3>
            <div className="space-y-4">
                <input
                    type="text"
                    value={doctorAddress}
                    onChange={(e) => setDoctorAddress(e.target.value)}
                    placeholder="Enter Doctor's Wallet Address (0x...)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex space-x-4">
                    <button onClick={handleGrant} disabled={isLoading} className="w-full px-4 py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">
                        {isLoading ? 'Processing...' : 'Grant Access'}
                    </button>
                    <button onClick={handleRevoke} disabled={isLoading} className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400">
                        {isLoading ? 'Processing...' : 'Revoke Access'}
                    </button>
                </div>
            </div>
            {message && <p className="mt-4 text-sm text-center text-gray-600 break-words">{message}</p>}
        </div>
    );
}