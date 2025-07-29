"use client";

import RegistrationForm from "@/components/RegistrationForm";
import Dashboard from "@/components/Dashboard";
import { useWeb3 } from "@/context/Web3Context";

export default function Home() {
  const { account, isRegistered } = useWeb3();

  const renderContent = () => {
    if (!account) {
      return (
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to MediLedger</h1>
          <p className="mt-4 text-gray-600">Please connect your wallet to continue.</p>
        </div>
      );
    }

    // If account is connected, check if they are registered
    return isRegistered ? <Dashboard /> : <RegistrationForm />;
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
      {renderContent()}
    </div>
  );
}
