"use client";
import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import axios from 'axios';
import AccessManager from './AccessManager';

// --- ICONS (unchanged) ---
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500"></div>;
const ApproveIcon = () => <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const RejectIcon = () => <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const MailOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;


// --- MODIFIED: Component now receives props from the dashboard ---
export default function RequestManager({ professionalRequests, onRequestsUpdate }) {
    const { contract, account, requests: insuranceRequests, fetchPendingRequests } = useWeb3();
    const [durations, setDurations] = useState({});
    const [isAccessManagerOpen, setIsAccessManagerOpen] = useState(false);
    const [selectedRequestForApproval, setSelectedRequestForApproval] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    // --- REMOVED: All internal data fetching logic (fetchProfessionalRequests, useEffect) ---
    // The dashboard now provides the data.

    const handleDurationChange = (requestId, value) => {
        setDurations(prev => ({ ...prev, [requestId]: value }));
    };

    const handleApproveInsurance = async (requestId) => {
        if (!contract || !account) return;
        setProcessingId(`ins-${requestId}`);
        const duration = durations[requestId] || 30;
        const toastId = toast.loading(`Approving request for ${duration} days...`);
        try {
            const tx = await contract.approveRequest(requestId, duration);
            await tx.wait();
            toast.success('Request approved!', { id: toastId });
            fetchPendingRequests(account, contract); // This is for insurance requests from Web3Context
        } catch (error) {
            console.error("Failed to approve request:", error);
            toast.error('Failed to approve request.', { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleProfessionalResponse = async (requestId, response) => {
        setProcessingId(requestId);
        const toastId = toast.loading(`Processing your response...`);
        try {
            await axios.post('http://localhost:3001/api/users/access-requests/respond', { requestId, response });
            toast.success(`Request successfully ${response}!`, { id: toastId });
            onRequestsUpdate(); // --- MODIFIED: Call the prop to trigger a refetch in the parent
        } catch (error) {
            console.error(`Failed to ${response} request:`, error);
            toast.error(`Failed to ${response} request.`, { id: toastId });
        } finally {
            setProcessingId(null);
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

    const combinedRequests = [
        ...(professionalRequests || []).map(r => ({ ...r, type: 'Professional' })),
        ...(insuranceRequests || []).map(r => ({ ...r, type: 'Insurance', requestId: `ins-${Number(r.id)}`}))
    ].sort((a,b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));


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
            
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-4">Requester</th>
                                <th scope="col" className="px-6 py-4">Type</th>
                                <th scope="col" className="px-6 py-4">Details</th>
                                <th scope="col" className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {combinedRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center p-12">
                                        <MailOpenIcon />
                                        <p className="font-semibold text-slate-600 mt-4">No Pending Requests</p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            You're all caught up!
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                combinedRequests.map((req) => (
                                    <tr key={req.requestId} className="bg-white border-b hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">{req.professional || 'Insurance Provider'}</div>
                                            <div className="font-mono text-xs text-slate-400 mt-1">{req.professionalAddress || req.provider}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${req.type === 'Professional' ? 'bg-sky-100 text-sky-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                                {req.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {req.type === 'Professional' ? (
                                                <ul className="list-disc list-inside space-y-1 text-xs">
                                                    {req.requestedRecords.map(rec => <li key={rec.recordId}>- {rec.title}</li>)}
                                                 </ul>
                                            ) : (
                                                <div className="text-xs"><strong>Claim ID:</strong> {req.claimId}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {req.type === 'Professional' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleProfessionalResponse(req.requestId, 'rejected')} disabled={processingId === req.requestId} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 inline-flex items-center">
                                                        <RejectIcon /> Reject
                                                    </button>
                                                    <button onClick={() => handleApproveProfessionalClick(req)} disabled={processingId === req.requestId} className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 inline-flex items-center">
                                                        <ApproveIcon /> Approve
                                                    </button>
                                                </div>
                                            ) : (
                                                 <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Days"
                                                        onChange={(e) => handleDurationChange(Number(req.id), e.target.value)}
                                                        className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                    />
                                                    <button onClick={() => handleApproveInsurance(Number(req.id))} disabled={processingId === `ins-${Number(req.id)}`} className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 inline-flex items-center">
                                                        {processingId === `ins-${Number(req.id)}` ? '...' : <><ApproveIcon/><span>Approve</span></>}
                                                    </button>
                                                 </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
}

