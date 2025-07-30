"use client";

import RegistrationForm from "@/components/RegistrationForm";
import Dashboard from "@/components/Dashboard";
import AdminDashboard from "@/components/AdminDashboard";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import InsuranceDashboard from "@/components/InsuranceDashboard"; // Import the InsuranceDashboard
import { useWeb3 } from "@/context/Web3Context";

export default function Home() {
  const { account, isRegistered, userProfile, owner } = useWeb3();

  const renderContent = () => {
    if (!account) {
      return (
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to MediLedger</h1>
          <p className="mt-4 text-gray-600">Please connect your wallet to continue.</p>
        </div>
      );
    }

    if (owner && account.toLowerCase() === owner.toLowerCase()) {
        return <SuperAdminDashboard />;
    }

    if (!isRegistered) {
      return <RegistrationForm />;
    }

    // This is the new, corrected logic block
    if (userProfile) {
        const role = Number(userProfile.role);
        // Role enum: HospitalAdmin is 2, InsuranceProvider is 3
        if (role === 2) {
            return <AdminDashboard />;
        }
        if (role === 3) {
            return <InsuranceDashboard />;
        }
    }

    // Default to the general user dashboard for Patients, Doctors, etc.
    return <Dashboard />;
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
      {renderContent()}
    </div>
  );
}
