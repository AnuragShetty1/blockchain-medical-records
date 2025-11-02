"use client";

import RegistrationForm from "@/components/RegistrationForm";
import Dashboard from "@/components/Dashboard";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import HospitalRequestPending from "@/components/HospitalRequestPending";
import { useWeb3 } from "@/context/Web3Context";
import Image from 'next/image'; // This import is kept for RegistrationViews
import PendingVerification from '@/components/PendingVerification';
import AccessRevoked from "@/components/AccessRevoked";

// --- NEW IMPORT ---
// We import our new, dedicated LandingPage component.
import LandingPage from "@/components/LandingPage";

// --- REMOVED ---
// LandingHeader, Footer, and lucide-react icons are no longer needed here.
// They are now correctly handled inside src/components/LandingPage.js.

export default function Home() {
    const { account, isRegistered, userProfile, owner, isLoadingProfile, userStatus } = useWeb3();

    const renderContent = () => {
        // --- MODIFICATION ---
        // This wrapper will be used for ALL logged-in states to preserve the
        // original layout (centered, gray background).
        const loggedInWrapper = (content) => (
            <div className="flex items-center justify-center min-h-[calc(100vh-128px)] bg-slate-50">
                {content}
            </div>
        );

        // --- NO CHANGES to any of this logged-in logic ---
        if (isLoadingProfile) {
            // Apply the wrapper to all logged-in views
            return loggedInWrapper(<DashboardSkeleton />);
        }

        if (account && owner && account.toLowerCase() === owner.toLowerCase()) {
            return loggedInWrapper(<SuperAdminDashboard />);
        }

        if (isRegistered && userProfile) {
            return loggedInWrapper(<Dashboard />);
        }

        if (account) {
            switch (userStatus) {
                case 'unregistered':
                    // RegistrationViews is a logged-in state, so it gets the wrapper.
                    return loggedInWrapper(<RegistrationViews />);
                case 'pending_hospital':
                case 'rejected':
                    return loggedInWrapper(<HospitalRequestPending />);
                case 'pending':
                    return loggedInWrapper(<PendingVerification />);
                
                case 'revoked':
                    return loggedInWrapper(<AccessRevoked />);

                default:
                    return loggedInWrapper(<DashboardSkeleton />);
            }
        }

        // --- MODIFICATION ---
        // If no account is connected, show the new <LandingPage />.
        // This component is full-width and does NOT use the loggedInWrapper.
        // This now refers to the component we imported.
        return <LandingPage />;
    };

    // --- NO CHANGES ---
    // This component is kept as-is, as it's part of the logged-in registration flow.
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

    // --- REMOVED ---
    // The old `WelcomeMessage` component is no longer needed.

    // --- REMOVED ---
    // The entire inline `LandingPage` component definition has been
    // deleted from this file.

    return (
        // --- NO CHANGES ---
        // This container is correct. `renderContent` will return
        // either the full-page <LandingPage/> or the dashboard components.
        <div className="w-full">
            {renderContent()}
        </div>
    );
}

