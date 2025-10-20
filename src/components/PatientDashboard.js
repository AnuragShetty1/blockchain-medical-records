"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import axios from 'axios'; // <-- NEW: Import axios for API calls

import UploadForm from "./UploadForm";
import AccessManagement from "./AccessManagement";
import RequestManager from "./RequestManager";
import Profile from "./Profile";
import RecordList from "./RecordList";
import DashboardSkeleton from './DashboardSkeleton';

// --- ICONS (unchanged) ---
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const RecordsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const AccessIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const RequestsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const ChevronDownIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


export default function PatientDashboard() {
    // --- MODIFIED: `requests` from Web3Context is now aliased to `insuranceRequests` for clarity ---
    const { userProfile, account, records, requests: insuranceRequests, accessList, refetchUserProfile } = useWeb3();
    const [activeView, setActiveView] = useState('dashboard');
    const [greeting, setGreeting] = useState('Welcome');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadFormVisible, setIsUploadFormVisible] = useState(false);
    
    // --- NEW: State and fetching logic for professional requests is now managed here ---
    const [professionalRequests, setProfessionalRequests] = useState([]);
    
    const fetchProfessionalRequests = useCallback(async () => {
        if (!account) return;
        try {
            const response = await axios.get(`http://localhost:3001/api/users/access-requests/patient/${account}`);
            if (response.data.success) {
                setProfessionalRequests(response.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch professional access requests:", error);
            // Don't show toast on silent background fetch
        }
    }, [account]);

    // --- NEW: useEffect for polling professional requests ---
    useEffect(() => {
        fetchProfessionalRequests(); // Initial fetch
        const intervalId = setInterval(fetchProfessionalRequests, 10000); // Poll every 10 seconds
        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [fetchProfessionalRequests]);


    if (!userProfile) {
        return <DashboardSkeleton />;
    }

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);
    
    const handleCopyAddress = () => {
        navigator.clipboard.writeText(userProfile.walletAddress)
            .then(() => toast.success('Address copied to clipboard!'))
            .catch(() => toast.error('Failed to copy address.'));
    };

    const handleViewChange = (view) => {
        setActiveView(view);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- MODIFIED: Calculation is now direct and always up-to-date ---
    const totalRequestCount = (insuranceRequests?.length || 0) + (professionalRequests?.length || 0);

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardOverview records={records || []} accessList={accessList || []} totalRequests={totalRequestCount} onNavigate={handleViewChange} />;
            case 'records':
                return (
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-6">My Records</h2>
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 mb-8 overflow-hidden">
                            <button
                                onClick={() => setIsUploadFormVisible(!isUploadFormVisible)}
                                className="w-full flex justify-between items-center p-6 text-left hover:bg-slate-50 transition-colors focus:outline-none"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-teal-100 text-teal-700 p-2 rounded-lg"><UploadIcon /></div>
                                    <h3 className="text-xl font-bold text-slate-800">Upload New Record</h3>
                                </div>
                                <ChevronDownIcon className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${isUploadFormVisible ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-500 ease-in-out ${isUploadFormVisible ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                 <div className="border-t border-slate-200">
                                    <div className="p-6 bg-slate-50/50">
                                        <div className="p-4 mb-6 text-sm text-sky-800 rounded-lg bg-sky-50 flex items-start gap-3" role="alert">
                                            <div className="flex-shrink-0 pt-0.5"><InfoIcon /></div>
                                            <div>
                                                <span className="font-bold">For Your Security:</span> All records are encrypted on your device before being uploaded. Only you and those you grant explicit permission to can view them.
                                            </div>
                                        </div>
                                        <UploadForm />
                                    </div>
                                 </div>
                            </div>
                        </div>
                        <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
                            <h3 className="text-2xl font-bold text-slate-800 mb-6">My Record History</h3>
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search records by title..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition mb-6"
                            />
                            <RecordList searchQuery={searchQuery} />
                        </div>
                    </div>
                );
            case 'access':
                return <AccessManagement />;
            case 'requests':
                return (
                    <DashboardContentCard title="Pending Requests">
                        {/* --- MODIFIED: Pass requests and the refetcher function as props --- */}
                        <RequestManager 
                            professionalRequests={professionalRequests}
                            onRequestsUpdate={fetchProfessionalRequests}
                        />
                    </DashboardContentCard>
                );
            case 'profile':
                return (
                    <DashboardContentCard title="My Profile">
                        <Profile onProfileUpdate={refetchUserProfile} />
                    </DashboardContentCard>
                );
            default:
                return <DashboardOverview records={records || []} accessList={accessList || []} totalRequests={totalRequestCount} onNavigate={handleViewChange} />;
        }
    };

    return (
        <div className="w-full bg-slate-100 flex items-start">
            <aside className="w-64 bg-white p-6 border-r border-slate-200 flex-col hidden md:flex sticky top-24">
                <div className="flex flex-col items-center text-center mb-8 pt-8">
                    <h1 className="text-lg font-bold text-slate-800">{greeting},</h1>
                    <p className="text-2xl font-bold text-teal-600 truncate w-full px-2">{userProfile.name}!</p>
                    {userProfile.contactInfo && (
                        <p className="text-sm text-slate-500 mt-1 truncate w-full px-2">{userProfile.contactInfo}</p>
                    )}
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-slate-700">Status</span>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${userProfile.isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {userProfile.isVerified ? "Verified" : "Not Verified"}
                        </span>
                    </div>
                    <div className="text-sm text-slate-500">
                        <p className="font-semibold text-slate-700">Wallet Address</p>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="font-mono text-xs truncate">{userProfile.walletAddress}</p>
                            <button onClick={handleCopyAddress} className="hover:text-teal-600 transition-colors"><CopyIcon /></button>
                        </div>
                    </div>
                </div>
                <nav className="flex flex-col space-y-2">
                    <NavItem icon={<DashboardIcon />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => handleViewChange('dashboard')} />
                    <NavItem icon={<RecordsIcon />} label="My Records" active={activeView === 'records'} onClick={() => handleViewChange('records')} />
                    <NavItem icon={<AccessIcon />} label="Access Management" active={activeView === 'access'} onClick={() => handleViewChange('access')} />
                    {/* --- MODIFIED: `notificationCount` is now always accurate --- */}
                    <NavItem icon={<RequestsIcon />} label="Pending Requests" active={activeView === 'requests'} onClick={() => handleViewChange('requests')} notificationCount={totalRequestCount} />
                    <NavItem icon={<ProfileIcon />} label="My Profile" active={activeView === 'profile'} onClick={() => handleViewChange('profile')} />
                </nav>
            </aside>
            <main className="flex-1 p-6 sm:p-8 lg:p-10">
                {renderContent()}
            </main>
        </div>
    );
}

const DashboardContentCard = ({ title, children }) => (
    <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800 mb-6">{title}</h2>
        {children}
    </div>
);


const NavItem = ({ icon, label, active, onClick, notificationCount = 0 }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition-colors duration-200 w-full text-left ${active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
    >
        {icon}
        <span className="flex-1">{label}</span>
        {notificationCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {notificationCount}
            </span>
        )}
    </button>
);

const DashboardOverview = ({ records, accessList, totalRequests, onNavigate }) => (
    <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
             <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
             <div className="flex space-x-2">
                <button
                    onClick={() => onNavigate('records')}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    <UploadIcon />
                    <span>Upload Record</span>
                </button>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Records" value={records?.length || 0} icon={<RecordsIcon />} />
            <StatCard title="Active Permissions" value={accessList?.length || 0} icon={<AccessIcon />} />
            <StatCard title="Pending Requests" value={totalRequests || 0} icon={<RequestsIcon />} highlight={(totalRequests || 0) > 0} />
        </div>

        <div className="mt-10 bg-white rounded-2xl shadow-xl border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 p-6 border-b border-slate-200">Recent Activity</h3>
            <RecentActivityFeed records={records || []} accessList={accessList || []} requests={[]} />
        </div>
    </div>
);

const StatCard = ({ title, value, icon, highlight = false }) => (
    <div className={`p-6 rounded-2xl shadow-xl border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${highlight ? 'text-amber-800' : 'text-slate-500'}`}>{title}</p>
            <div className={`${highlight ? 'text-amber-600' : 'text-slate-400'}`}>{icon}</div>
        </div>
        <p className={`text-4xl font-bold mt-2 ${highlight ? 'text-amber-900' : 'text-slate-800'}`}>{value}</p>
    </div>
);

const RecentActivityFeed = ({ records, accessList, requests }) => {
    const [activity, setActivity] = useState([]);

    useEffect(() => {
        const recordActivities = (records || []).map(r => ({
            type: 'Record Added',
            description: `New record uploaded.`,
            timestamp: Number(r.timestamp) * 1000,
            icon: <UploadIcon />,
            color: 'text-sky-500',
            bgColor: 'bg-sky-50'
        }));

        const accessActivities = (accessList || []).map((user, index) => ({
            type: 'Access Granted',
            description: `Access granted to ${user.name || 'a provider'}.`,
            timestamp: Date.now() - index * 10000,
            icon: <AccessIcon />,
            color: 'text-green-500',
            bgColor: 'bg-green-50'
        }));

        const requestActivities = (requests || []).map((req, index) => ({
            type: 'Request Received',
            description: `Access request from ${req.requestor}.`,
            timestamp: Date.now() - index * 10000,
            icon: <RequestsIcon />,
            color: 'text-amber-500',
            bgColor: 'bg-amber-50'
        }));

        const allActivities = [...recordActivities, ...accessActivities, ...requestActivities];
        allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setActivity(allActivities.slice(0, 5));
    }, [records, accessList, requests]);

    if (activity.length === 0) {
        return <p className="p-6 text-slate-500">No recent activity to display.</p>;
    }

    return (
        <ul className="divide-y divide-slate-200">
            {activity.map((item, index) => (
                <li key={index} className="flex items-center p-4 space-x-4 hover:bg-slate-50">
                    <div className={`p-2 rounded-full ${item.bgColor} ${item.color}`}>
                        {item.icon}
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-slate-800">{item.type}</p>
                        <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                    <p className="text-xs text-slate-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                    </p>
                </li>
            ))}
        </ul>
    );
};

