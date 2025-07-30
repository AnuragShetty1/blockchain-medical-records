"use client";

import RegistrationForm from "@/components/RegistrationForm";
import Dashboard from "@/components/Dashboard";
import AdminDashboard from "@/components/AdminDashboard";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import InsuranceDashboard from "@/components/InsuranceDashboard";
import DashboardSkeleton from "@/components/DashboardSkeleton"; // Import the new component
import { useWeb3 } from "@/context/Web3Context";

export default function Home() {
  const { account, isRegistered, userProfile, owner, isLoadingProfile } = useWeb3();

  const renderContent = () => {
    if (!account) {
      return (
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to MediLedger</h1>
          <p className="mt-4 text-gray-600">Please connect your wallet to continue.</p>
        </div>
      );
    }

    // --- NEW: Show the skeleton during the initial data fetch ---
    if (isLoadingProfile) {
        return <DashboardSkeleton />;
    }

    if (owner && account.toLowerCase() === owner.toLowerCase()) {
        return <SuperAdminDashboard />;
    }

    if (!isRegistered) {
      return <RegistrationForm />;
    }

    if (userProfile) {
        const role = Number(userProfile.role);
        if (role === 2) { return <AdminDashboard />; }
        if (role === 3) { return <InsuranceDashboard />; }
    }

    return <Dashboard />;
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
      {renderContent()}
    </div>
  );
}
