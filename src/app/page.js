"use client";

import RegistrationForm from "@/components/RegistrationForm";
import Dashboard from "@/components/Dashboard";
import AdminDashboard from "@/components/AdminDashboard";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import InsuranceDashboard from "@/components/InsuranceDashboard";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { useWeb3 } from "@/context/Web3Context";
import Image from 'next/image'; // Make sure Image is imported

export default function Home() {
    const { account, isRegistered, userProfile, owner, isLoadingProfile } = useWeb3();

    const renderContent = () => {
        // --- Loading State ---
        if (isLoadingProfile) {
            return <DashboardSkeleton />;
        }

        // --- Role-Based Dashboards ---
        if (owner && account && account.toLowerCase() === owner.toLowerCase()) {
            return <SuperAdminDashboard />;
        }

        if (isRegistered && userProfile) {
            const role = Number(userProfile.role);
            if (role === 2) { return <AdminDashboard />; }
            if (role === 3) { return <InsuranceDashboard />; }
            return <Dashboard />;
        }

        // --- Welcome / Registration View ---
        return (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                {/* Left Side: Informational Content */}
                <div className="p-8">
                    <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-4">
                        Your Health Records, Secured on the Blockchain.
                    </h1>
                    <p className="text-lg text-slate-600 mb-8">
                        Welcome to <strong>PRISM</strong> (Patient Record Integrity and Security Management), a new era of medical data management where you are in complete control.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-start">
                            <svg className="w-6 h-6 text-teal-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <div>
                                <h3 className="font-semibold text-slate-700">Patient Sovereignty</h3>
                                <p className="text-slate-500 text-sm">Only you can grant access to your records. Every action is a secure, on-chain transaction.</p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <svg className="w-6 h-6 text-teal-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            <div>
                                <h3 className="font-semibold text-slate-700">Unmatched Security</h3>
                                <p className="text-slate-500 text-sm">Your medical files are encrypted and stored decentrally on IPFS, not on a vulnerable central server.</p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <svg className="w-6 h-6 text-teal-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                            <div>
                                <h3 className="font-semibold text-slate-700">Seamless Interoperability</h3>
                                <p className="text-slate-500 text-sm">Built on open standards, allowing verified providers to access a unified view of your health history.</p>
                            </div>
                        </li>
                    </ul>
                </div>
                {/* Right Side: Registration Form */}
                <div>
                    {account ? <RegistrationForm /> : <WelcomeMessage />}
                </div>
            </div>
        );
    };

    const WelcomeMessage = () => (
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
            {/* [MODIFIED] Added flex layout and logo image */}
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-gray-800 flex gap-1 justify-center items-center">Welcome to PRISM<Image
                    src="/logo.png"
                    alt="PRISM Logo"
                    width={50}
                    height={50}
                /></h1>
                </div>
                
                <p className="text-2xl font-bold font-semibold text-gray-600">
                    Patient Record Integrity and Security Management
                </p>
                <p className="pt-4 text-gray-600">
                    Please connect your wallet to begin the registration process.
                </p>
            </div>
        </div>
    );

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-128px)] px-4 bg-slate-50">
            {renderContent()}
        </div>
    );
}