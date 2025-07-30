"use client";
import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

export default function AccessManager() {
    // Get state and functions from the global context
    const { contract, account, accessList, fetchAccessList } = useWeb3();
    const [addressToGrant, setAddressToGrant] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGrant = async (e) => {
        e.preventDefault();
        if (!addressToGrant || !contract) return;
        setIsLoading(true);
        const toastId = toast.loading(`Granting direct access to ${addressToGrant.substring(0, 6)}...`);
        try {
            const tx = await contract.grantAccess(addressToGrant);
            await tx.wait();
            toast.success("Access granted successfully!", { id: toastId });
            fetchAccessList(account, contract); // Refresh the list
            setAddressToGrant('');
        } catch (error) {
            console.error("Failed to grant access:", error);
            toast.error("Failed to grant access. Is it a verified doctor's address?", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevoke = async (userAddress) => {
        if (!contract) return;
        setIsLoading(true);
        const toastId = toast.loading(`Revoking access for ${userAddress.substring(0, 6)}...`);
        try {
            const tx = await contract.revokeAccess(userAddress);
            await tx.wait();
            toast.success("Access revoked successfully!", { id: toastId });
            fetchAccessList(account, contract); // Refresh the list
        } catch (error) {
            console.error("Failed to revoke access:", error);
            toast.error("Failed to revoke access.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Access Management</h3>

            {/* Form to Grant Direct Access */}
            <form onSubmit={handleGrant} className="mb-6 p-4 border rounded-lg bg-white">
                <label htmlFor="grantAddress" className="block text-sm font-medium text-gray-700 mb-1">Grant Direct Access to a Doctor</label>
                <div className="flex gap-4">
                    <input
                        id="grantAddress"
                        type="text"
                        value={addressToGrant}
                        onChange={(e) => setAddressToGrant(e.target.value)}
                        placeholder="Enter Doctor's Wallet Address (0x...)"
                        className="flex-grow px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button type="submit" disabled={isLoading} className="px-4 py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">
                        Grant
                    </button>
                </div>
            </form>

            {/* List of Users with Access */}
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Current Permissions</h4>
            {accessList.length === 0 ? (
                <p className="text-gray-500">You have not granted access to any users.</p>
            ) : (
                <div className="space-y-3">
                    {accessList.map((address, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white rounded-md shadow-sm">
                            <p className="font-mono text-sm">{address}</p>
                            <button onClick={() => handleRevoke(address)} disabled={isLoading} className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-red-700 disabled:bg-gray-400">
                                Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}