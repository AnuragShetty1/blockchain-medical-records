"use client";
import { useWeb3 } from "@/context/Web3Context";
import UploadForm from "./UploadForm";
import RecordList from "./RecordList";
import AccessControl from "./AccessControl";
import DoctorView from "./DoctorView";
import RequestManager from "./RequestManager"; // Import

export default function Dashboard() {
    const { userProfile } = useWeb3();
    const roleNames = ["Patient", "Doctor", "HospitalAdmin", "InsuranceProvider", "Pharmacist", "Researcher", "Guardian"];

    if (!userProfile) { 
        return <div className="text-center"><p>Loading user profile...</p></div>;
    }

    const role = roleNames[Number(userProfile.role)];

    return (
        <div className="w-full max-w-2xl">
            <div className="p-8 bg-white rounded-lg shadow-md">
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">Welcome, {userProfile.name}!</h2>
                <div className="space-y-4 text-lg">
                   <div className="flex justify-between">
                       <span className="font-semibold text-gray-600">Your Role:</span>
                       <span className="font-bold text-teal-600">{role}</span>
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

            {role === "Patient" && (
                <>
                    <RequestManager /> {/* Add this component */}
                    <AccessControl />
                    <UploadForm />
                    <RecordList />
                </>
            )}

            {role === "Doctor" && userProfile.isVerified && <DoctorView />}
        </div>
    );
}
