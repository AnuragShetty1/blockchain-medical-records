"use client";

import RegistrationForm from "@/components/RegistrationForm";
import Dashboard from "@/components/Dashboard";
import AdminDashboard from "@/components/AdminDashboard";
import InsuranceDashboard from "@/components/InsuranceDashboard"; // Import
import { useWeb3 } from "@/context/Web3Context";

export default function Home() {
  const { account, isRegistered, userProfile } = useWeb3();

  const renderContent = () => {
    if (!account) {
      return (
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to MediLedger</h1>
          <p className="mt-4 text-gray-600">Please connect your wallet to continue.</p>
        </div>
      );
    }

    if (!isRegistered) {
      return <RegistrationForm />;
    }

    // Role enum: InsuranceProvider is 3
    if (userProfile && Number(userProfile.role) === 3) {
        return <InsuranceDashboard />;
    }
    if (userProfile && Number(userProfile.role) === 2) {
        return <AdminDashboard />;
    }
    return <Dashboard />;
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
      {renderContent()}
    </div>
  );
}