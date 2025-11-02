"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    FileText,
    ShieldCheck,
    Bell,
    User,
    Copy,
    Info,
    Upload,
    Pointer,
    Lock,
    Users,
    Activity,
    Search
} from 'lucide-react';

// Corrected relative imports (removed .js)
import UploadForm from "./UploadForm";
import AccessManagement from "./AccessManagement";
import RequestManager from "./RequestManager";
import Profile from "./Profile";
import RecordList from "./RecordList";
import DashboardSkeleton from './DashboardSkeleton';

export default function PatientDashboard() {
    const { userProfile, account, records, requests: insuranceRequests, accessList, refetchUserProfile } = useWeb3();
    const [activeTab, setActiveTab] = useState('overview');
    const [greeting, setGreeting] = useState('Welcome');
    const [searchQuery, setSearchQuery] = useState('');
    
    // REMOVED: isUploadFormVisible state is no longer needed as it's in its own tab.
    // const [isUploadFormVisible, setIsUploadFormVisible] = useState(false);

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
        }
    }, [account]);

    useEffect(() => {
        fetchProfessionalRequests();
        const intervalId = setInterval(fetchProfessionalRequests, 10000);
        return () => clearInterval(intervalId);
    }, [fetchProfessionalRequests]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const handleCopyAddress = () => {
        if (!userProfile?.walletAddress) return;
        // Use document.execCommand for reliability in iframe environments
        try {
            const tempInput = document.createElement('input');
            tempInput.value = userProfile.walletAddress;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            toast.success('Address copied to clipboard!');
        } catch (err) {
            toast.error('Failed to copy address.');
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const totalRequestCount = (insuranceRequests?.length || 0) + (professionalRequests?.length || 0);

    if (!userProfile) {
        return <DashboardSkeleton />;
    }

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'overview':
                return <DashboardOverview
                    records={records || []}
                    accessList={accessList || []}
                    totalRequests={totalRequestCount}
                />;
            // MODIFIED: 'records' tab is now 'record-list'
            case 'record-list':
                return <RecordListTabContent
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />;
            // NEW: 'upload' tab
            case 'upload':
                return <UploadTabContent />;
            case 'access':
                return <AccessTabContent />;
            case 'requests':
                return (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">Pending Requests</h2>
                        <RequestManager
                            professionalRequests={professionalRequests}
                            onRequestsUpdate={fetchProfessionalRequests}
                        />
                    </div>
                );
            case 'profile':
                return (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h2>
                        <Profile onProfileUpdate={refetchUserProfile} />
                    </div>
                );
            default:
                return <DashboardOverview
                    records={records || []}
                    accessList={accessList || []}
                    totalRequests={totalRequestCount}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                <DashboardHeader
                    userProfile={userProfile}
                    greeting={greeting}
                    onCopyAddress={handleCopyAddress}
                    onNavigate={handleTabChange}
                />
                <TabNavigation
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    totalRequests={totalRequestCount}
                />
                <main>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderActiveTab()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

const DashboardHeader = ({ userProfile, greeting, onCopyAddress, onNavigate }) => (
    <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8"
    >
        <div className="flex flex-col md:flex-row justify-between gap-6">
            {/* Left Side: Greeting & Status */}
            <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{greeting}, {userProfile.name}!</h1>
                <p className="text-lg text-gray-600 mt-1">Welcome to your personal health dashboard.</p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 mt-4 max-w-md">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Status</span>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${userProfile.isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {userProfile.isVerified ? "Verified" : "Not Verified"}
                        </span>
                    </div>
                    <div className="text-sm text-gray-500">
                        <p className="font-semibold text-gray-700">Wallet Address</p>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="font-mono text-xs text-gray-600 truncate">{userProfile.walletAddress}</p>
                            <button onClick={onCopyAddress} className="text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0">
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Quick Actions */}
            <div className="md:w-64 flex-shrink-0">
                <QuickActions onNavigate={onNavigate} />
            </div>
        </div>
    </motion.div>
);

const TabNavigation = ({ activeTab, onTabChange, totalRequests }) => {
    const tabs = [
        { name: 'Overview', key: 'overview', icon: LayoutDashboard },
        // MODIFIED: Split 'My Records' into two tabs
        { name: 'My Records', key: 'record-list', icon: FileText },
        { name: 'Upload Record', key: 'upload', icon: Upload },
        { name: 'Access Management', key: 'access', icon: ShieldCheck },
        { name: 'Pending Requests', key: 'requests', icon: Bell },
        { name: 'My Profile', key: 'profile', icon: User },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2">
            <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={`relative flex-1 flex justify-center items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.key
                            ? 'text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <tab.icon className="h-5 w-5" />
                        <span>{tab.name}</span>
                        {tab.key === 'requests' && totalRequests > 0 && (
                            <span className="absolute top-1 right-1 h-5 w-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {totalRequests}
                            </span>
                        )}
                        {activeTab === tab.key && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full"
                            />
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );
};

const DashboardOverview = ({ records, accessList, totalRequests }) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Records" value={records?.length || 0} icon={<FileText className="text-blue-600" />} />
            <StatCard title="Active Permissions" value={accessList?.length || 0} icon={<ShieldCheck className="text-green-600" />} />
            <StatCard
                title="Pending Requests"
                value={totalRequests || 0}
                icon={<Bell className={totalRequests > 0 ? "text-red-600" : "text-gray-500"} />}
                highlight={totalRequests > 0}
            />
        </div>
        <div className="grid grid-cols-1 gap-6">
            <RecentActivityFeed records={records || []} accessList={accessList || []} requests={[]} />
        </div>
    </div>
);

const StatCard = ({ title, value, icon, highlight = false }) => (
    <motion.div
        whileHover={{ scale: 1.03 }}
        className={`p-6 rounded-2xl shadow-xl border ${highlight ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}
    >
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${highlight ? 'bg-red-100' : 'bg-gray-100'}`}>
                {icon}
            </div>
            <div>
                <p className={`text-sm font-medium ${highlight ? 'text-red-800' : 'text-gray-600'}`}>{title}</p>
                <p className={`text-3xl font-bold ${highlight ? 'text-red-900' : 'text-gray-900'}`}>{value}</p>
            </div>
        </div>
    </motion.div>
);

const QuickActions = ({ onNavigate }) => (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Quick Actions</h3>
        <button
            // MODIFIED: Point to the new 'upload' tab
            onClick={() => onNavigate('upload')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
            <Upload className="h-5 w-5" />
            <span>Upload Record</span>
        </button>
        <button
            onClick={() => onNavigate('access')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
        >
            <Pointer className="h-5 w-5" />
            <span>Grant Access</span>
        </button>
    </div>
);

// REMOVED: RecordsTabContent component is split into two new components below.

// NEW: Component for the "Upload Record" tab
const UploadTabContent = () => (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 text-blue-700 p-3 rounded-lg">
                <Upload className="h-6 w-6" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-gray-900">Upload New Record</h3>
                <p className="text-gray-600">Add a new document to your encrypted health profile.</p>
            </div>
        </div>
        
        <div className="p-6 bg-gray-50/50 rounded-lg border border-gray-200">
            <div className="p-4 mb-6 text-sm text-blue-800 rounded-lg bg-blue-50 flex items-start gap-3" role="alert">
                <div className="flex-shrink-0 pt-0.5"><Info className="h-5 w-5" /></div>
                <div>
                    <span className="font-bold">For Your Security:</span> All records are encrypted on your device before being uploaded. Only you and those you grant explicit permission to can view them.
                </div>
            </div>
            <UploadForm />
        </div>
    </div>
);

// NEW: Component for the "My Records" (list) tab
const RecordListTabContent = ({ searchQuery, setSearchQuery }) => (
    <div className="p-6 md:p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">My Record History</h3>
        <div className="relative">
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search records by title, type, or provider..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        <div className="mt-6">
            <RecordList searchQuery={searchQuery} />
        </div>
    </div>
);


const AccessTabContent = () => (
    <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                    <Info className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">How It Works</h3>
            </div>
            <p className="text-sm text-gray-600">
                You are in complete control. Your records are end-to-end encrypted. Granting access creates a temporary, on-chain permission for a *specific* provider.
            </p>
            <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Only providers you approve can see your data.</span>
                </li>
                <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span>You can revoke access at any time, instantly.</span>
                </li>
                <li className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span>Every action is logged on the blockchain for full transparency.</span>
                </li>
            </ul>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Manage Provider Access</h2>
            <AccessManagement />
        </div>
    </div>
);

const RecentActivityFeed = ({ records, accessList, requests }) => {
    const [activity, setActivity] = useState([]);

    useEffect(() => {
        const recordActivities = (records || []).map(r => ({
            type: 'Record Added',
            description: r.title || `New record uploaded.`,
            timestamp: Number(r.timestamp) * 1000,
            icon: Upload,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        }));

        const accessActivities = (accessList || []).map((user, index) => ({
            type: 'Access Granted',
            description: `Access granted to ${user.name || 'a provider'}.`,
            timestamp: Date.now() - index * 100000, // Faked for demo
            icon: ShieldCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        }));

        const requestActivities = (requests || []).map((req, index) => ({
            type: 'Request Received',
            description: `Access request from ${req.requestor}.`,
            timestamp: Date.now() - index * 100000, // Faked for demo
            icon: Bell,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
        }));

        const allActivities = [...recordActivities, ...accessActivities, ...requestActivities];
        allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setActivity(allActivities.slice(0, 5));
    }, [records, accessList, requests]);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 p-6 border-b border-gray-200">Recent Activity</h3>
            {activity.length === 0 ? (
                <p className="p-6 text-gray-500">No recent activity to display.</p>
            ) : (
                <ul className="divide-y divide-gray-200">
                    {activity.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <li key={index} className="flex items-center p-4 space-x-4 hover:bg-gray-50 transition-colors">
                                <div className={`p-3 rounded-full ${item.bgColor} ${item.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800">{item.type}</p>
                                    <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

