"use client";

import { useWeb3 } from "@/context/Web3Context";

export default function Dashboard() {
    const { userProfile } = useWeb3();

    // An array to map the enum number to a string
    const roleNames = [
        "Patient", "Doctor", "Hospital Admin", "Insurance Provider", 
        "Pharmacist", "Researcher", "Guardian"
    ];

    if (!userProfile) {
        return (
            <div className="text-center">
                <p>Loading user profile...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">Welcome, {userProfile.name}!</h2>
            <div className="space-y-4 text-lg">
                <div className="flex justify-between">
                    <span className="font-semibold text-gray-600">Your Role:</span>
                    <span className="font-bold text-teal-600">{roleNames[Number(userProfile.role)]}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold text-gray-600">Status:</span>
                    <span className={`font-bold ${userProfile.isVerified ? 'text-green-500' : 'text-red-500'}`}>
                        {userProfile.isVerified ? "Verified" : "Not Verified"}
                    </span>
                </div>
                <div className="flex flex-col text-sm pt-4">
                    <span className="font-semibold text-gray-600">Wallet Address:</span>
                    <span className="text-gray-500 break-all">{userProfile.walletAddress}</span>
                </div>
            </div>
        </div>
    );
}