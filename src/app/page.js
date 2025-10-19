"use client";

import RegistrationForm from "@/components/RegistrationForm";
import Dashboard from "@/components/Dashboard";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import HospitalRequestPending from "@/components/HospitalRequestPending";
import { useWeb3 } from "@/context/Web3Context";
import Image from 'next/image';
import PendingVerification from '@/components/PendingVerification';

export default function Home() {
    // --- MISTAKE ---
    // The component was managing its own local `userStatus` state (`const [userStatus, setUserStatus] = useState(null);`).
    // This local state was fetched only once when the user connected their wallet and was NOT updated when the 
    // central Web3Context state changed after registration. This caused the UI to remain stuck on the registration page.
    
    // --- FIX ---
    // The local state and the useEffect that managed it have been removed. The component now
    // gets the `userStatus` directly from the `useWeb3` hook. Because the context is the single
    // source of truth, when `refetchUserProfile()` is called after registration, this component
    // will now automatically re-render with the new, correct status from the context and display the pending page.
    const { account, isRegistered, userProfile, owner, isLoadingProfile, userStatus } = useWeb3();

    const renderContent = () => {
        // Use isLoadingProfile from the context, which now correctly reflects the entire profile loading process.
        if (isLoadingProfile) {
            return <DashboardSkeleton />;
        }

        // Super Admin check remains the same.
        if (account && owner && account.toLowerCase() === owner.toLowerCase()) {
            return <SuperAdminDashboard />;
        }

        // Registered user check remains the same.
        if (isRegistered && userProfile) {
            return <Dashboard />;
        }

        // The logic now correctly uses the reactive `userStatus` from the context.
        if (account) {
            switch (userStatus) {
                case 'unregistered':
                    return <RegistrationViews />;
                case 'pending_hospital':
                case 'rejected':
                    return <HospitalRequestPending />;
                case 'pending':
                     return <PendingVerification />;
                default:
                    // This handles the initial loading state before the user's status is determined by the context.
                    return <DashboardSkeleton />;
            }
        }

        // If no account is connected, show the welcome message.
        return <WelcomeMessage />;
    };

    const RegistrationViews = () => (
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
                        <svg className="w-6 h-6 text-teal-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <div>
                            <h3 className="font-semibold text-slate-700">Patient Sovereignty</h3>
                            <p className="text-slate-500 text-sm">Only you can grant access to your records. Every action is a secure, on-chain transaction.</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <svg className="w-6 h-6 text-teal-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        <div>
                            <h3 className="font-semibold text-slate-700">Unmatched Security</h3>
                            <p className="text-slate-500 text-sm">Your medical files are encrypted and stored decentrally on IPFS, not on a vulnerable central server.</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <svg className="w-6 h-6 text-teal-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        <div>
                            <h3 className="font-semibold text-slate-700">Seamless Interoperability</h3>
                            <p className="text-slate-500 text-sm">Built on open standards, allowing verified providers to access a unified view of your health history.</p>
                        </div>
                    </li>
                </ul>
            </div>
            <div>
                <RegistrationForm />
            </div>
        </div>
    );

    const WelcomeMessage = () => (
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
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
