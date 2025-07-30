"use client";
import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

export default function AccessManager() {
    const { contract, account } = useWeb3();
    // The access list will now store full user objects, not just addresses
    const [accessList, setAccessList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [addressToGrant, setAddressToGrant] = useState('');
    const roleNames = ["Patient", "Doctor", "Hospital Admin", "Insurance Provider", "Pharmacist", "Researcher", "Guardian"];

    const fetchAccessList = useCallback(async () => {
        if (contract && account) {
            setIsLoading(true);
            try {
                const addresses = await contract.getAccessList(account);
                // Map over the addresses and fetch the user details for each one
                const userPromises = addresses.map(address => contract.users(address));
                const userDetails = await Promise.all(userPromises);
                setAccessList(userDetails);
            } catch (error) {
                console.error("Failed to fetch access list:", error);
                toast.error("Could not load access list.");
            } finally {
                setIsLoading(false);
            }
        }
    }, [contract, account]);

    useEffect(() => {
        fetchAccessList();
    }, [fetchAccessList]);

    const handleGrant = async (e) => {
        e.preventDefault();
        if (!addressToGrant || !contract) return;
        const toastId = toast.loading(`Granting direct access...`);
        try {
            const tx = await contract.grantAccess(addressToGrant);
            await tx.wait();
            toast.success("Access granted successfully!", { id: toastId });
            fetchAccessList(); // Refresh the list
            setAddressToGrant('');
        } catch (error) {
            console.error("Failed to grant access:", error);
            toast.error("Failed to grant access. Is it a verified doctor's address?", { id: toastId });
        }
    };

    const handleRevoke = async (userAddress) => {
        if (!contract) return;
        const toastId = toast.loading(`Revoking access...`);
        try {
            const tx = await contract.revokeAccess(userAddress);
            await tx.wait();
            toast.success("Access revoked successfully!", { id: toastId });
            fetchAccessList(); // Refresh the list
        } catch (error) {
            console.error("Failed to revoke access:", error);
            toast.error("Failed to revoke access.", { id: toastId });
        }
    };

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Access Management</h3>

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
                    <button type="submit" className="px-4 py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">
                        Grant
                    </button>
                </div>
            </form>

            <h4 className="text-lg font-semibold text-gray-700 mb-3">Current Permissions</h4>
            {isLoading ? (
                <p>Loading access list...</p>
            ) : accessList.length === 0 ? (
                <p className="text-gray-500">You have not granted access to any users.</p>
            ) : (
                <div className="space-y-3">
                    {accessList.map((user, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white rounded-md shadow-sm">
                            <div>
                                <p className="font-semibold">{user.name} <span className="text-xs font-normal text-gray-500">({roleNames[Number(user.role)]})</span></p>
                                <p className="font-mono text-xs text-gray-600">{user.walletAddress}</p>
                            </div>
                            <button onClick={() => handleRevoke(user.walletAddress)} className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-red-700">
                                Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
