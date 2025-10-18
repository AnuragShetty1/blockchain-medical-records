"use client";
import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import axios from 'axios';
import AccessManager from './AccessManager'; // Import AccessManager

// --- ICONS ---
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500"></div>;
const ApproveIcon = () => <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const RejectIcon = () => <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;


export default function RequestManager({ onCountChange }) {
    const { contract, account, requests: insuranceRequests, fetchPendingRequests } = useWeb3();
    const [professionalRequests, setProfessionalRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // State for insurance request durations
    const [durations, setDurations] = useState({});
    
    // State for handling the approval modal for professional requests
    const [isAccessManagerOpen, setIsAccessManagerOpen] = useState(false);
    const [selectedRequestForApproval, setSelectedRequestForApproval] = useState(null);

    const fetchProfessionalRequests = useCallback(async () => {
        if (!account) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:3001/api/users/access-requests/patient/${account}`);
            if (response.data.success) {
                setProfessionalRequests(response.data.data);
                if(onCountChange) {
                    onCountChange(response.data.data.length);
                }
            }
        } catch (error) {
            console.error("Failed to fetch professional access requests:", error);
            toast.error("Could not load professional requests.");
        } finally {
            setIsLoading(false);
        }
    }, [account, onCountChange]);

    useEffect(() => {
        fetchProfessionalRequests();
    }, [fetchProfessionalRequests]);

    const handleDurationChange = (requestId, value) => {
        setDurations(prev => ({ ...prev, [requestId]: value }));
    };

    const handleApproveInsurance = async (requestId) => {
        if (!contract || !account) return;
        const duration = durations[requestId] || 30; // Default to 30 days
        const toastId = toast.loading(`Approving request for ${duration} days...`);
        try {
            const tx = await contract.approveRequest(requestId, duration);
            await tx.wait();
            toast.success('Request approved!', { id: toastId });
            fetchPendingRequests(account, contract);
        } catch (error) {
            console.error("Failed to approve request:", error);
            toast.error('Failed to approve request.', { id: toastId });
        }
    };

    const handleProfessionalResponse = async (requestId, response) => {
        const toastId = toast.loading(`Processing your response...`);
        try {
            await axios.post('http://localhost:3001/api/users/access-requests/respond', { requestId, response });
            toast.success(`Request successfully ${response}!`, { id: toastId });
            fetchProfessionalRequests(); // Refresh list
        } catch (error) {
            console.error(`Failed to ${response} request:`, error);
            toast.error(`Failed to ${response} request.`, { id: toastId });
        }
    };

    const handleApproveProfessionalClick = (request) => {
        setSelectedRequestForApproval(request);
        setIsAccessManagerOpen(true);
    };

    const onGrantSuccess = () => {
        if (selectedRequestForApproval) {
            handleProfessionalResponse(selectedRequestForApproval.requestId, 'approved');
        }
        setIsAccessManagerOpen(false);
        setSelectedRequestForApproval(null);
    };

    const totalRequests = insuranceRequests.length + professionalRequests.length;

    if (isLoading) {
        return <div className="flex justify-center items-center py-8"><Spinner /><p className="ml-4">Loading requests...</p></div>;
    }

    if (totalRequests === 0) {
        return <p className="text-center text-slate-500 py-8">You have no pending access requests.</p>;
    }

    return (
        <div className="space-y-8">
            {isAccessManagerOpen && selectedRequestForApproval && (
                 <AccessManager
                    isOpen={isAccessManagerOpen}
                    onClose={() => setIsAccessManagerOpen(false)}
                    preselectedProfessional={{
                        name: selectedRequestForApproval.professional,
                        address: selectedRequestForApproval.professionalAddress
                    }}
                    preselectedRecords={selectedRequestForApproval.requestedRecords}
                    onGrantSuccess={onGrantSuccess}
                />
            )}

            {professionalRequests.length > 0 && (
                <RequestSection title="From Healthcare Professionals">
                    {professionalRequests.map((req) => (
                        <div key={req.requestId} className="p-4 bg-white rounded-md shadow-sm border border-slate-200">
                             <p className="font-semibold text-slate-800">Request from: <span className="font-bold text-teal-700">{req.professional}</span></p>
                             <p className="text-sm text-slate-500 font-mono">{req.professionalAddress}</p>
                             <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="font-semibold text-slate-700 mb-2">Records Requested:</p>
                                <ul className="list-disc list-inside space-y-1 text-slate-600">
                                    {req.requestedRecords.map(rec => <li key={rec.recordId}>- {rec.title}</li>)}
                                </ul>
                             </div>
                             <div className="mt-4 flex items-center justify-end gap-3">
                                <button onClick={() => handleProfessionalResponse(req.requestId, 'rejected')} className="px-4 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-full hover:bg-red-200 inline-flex items-center gap-2">
                                    <RejectIcon /> Reject
                                </button>
                                 <button onClick={() => handleApproveProfessionalClick(req)} className="px-4 py-1.5 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600 inline-flex items-center gap-2">
                                    <ApproveIcon /> Approve
                                 </button>
                             </div>
                        </div>
                    ))}
                </RequestSection>
            )}

            {insuranceRequests.length > 0 && (
                <RequestSection title="From Insurance Providers">
                    {insuranceRequests.map((req) => (
                        <div key={Number(req.id)} className="p-4 bg-white rounded-md shadow-sm border border-slate-200">
                            <p><strong>Provider:</strong> <span className="font-mono text-sm">{req.provider}</span></p>
                            <p><strong>Claim ID:</strong> {req.claimId}</p>
                            <div className="mt-3 flex items-center gap-4">
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Days (e.g., 30)"
                                    onChange={(e) => handleDurationChange(Number(req.id), e.target.value)}
                                    className="w-32 px-3 py-1 border border-gray-300 rounded-md"
                                />
                                <button onClick={() => handleApproveInsurance(Number(req.id))} className="px-4 py-1.5 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600 inline-flex items-center gap-2">
                                     <ApproveIcon /> Approve
                                </button>
                            </div>
                        </div>
                    ))}
                </RequestSection>
            )}
        </div>
    );
}

const RequestSection = ({ title, children }) => (
    <div>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg shadow-inner border border-slate-200">
             {children}
        </div>
    </div>
);
