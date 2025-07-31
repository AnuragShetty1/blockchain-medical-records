"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';

// --- SVG Icons ---
const HistoryIcon = () => <svg className="w-8 h-8 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18-3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
const FileIcon = () => <svg className="w-6 h-6 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const ExternalLinkIcon = () => <svg className="w-4 h-4 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;


/**
 * A component to display a paginated list of medical records in a professional, card-based layout.
 */
export default function RecordList({ records: recordsFromProps }) {
    const { records: recordsFromContext } = useWeb3();
    const records = recordsFromProps || recordsFromContext;
    
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;

    const totalPages = Math.ceil(records.length / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(Number(timestamp) * 1000);
        return date.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // --- Empty State ---
    if (!records || records.length === 0) {
        return (
            <div className="w-full p-8 text-center bg-white rounded-xl shadow-md border border-slate-200">
                <HistoryIcon />
                <h3 className="text-xl font-bold text-slate-800 mt-4">No Records Found</h3>
                <p className="text-slate-500 mt-1">This patient has not uploaded any medical documents yet.</p>
            </div>
        );
    }

    // --- Main Component ---
    return (
        <div className="w-full bg-white rounded-xl shadow-md border border-slate-200">
            <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Medical History</h3>
                <p className="text-slate-500 text-sm">{records.length} record(s) found</p>
            </div>
            
            <ul className="divide-y divide-slate-200">
                {currentRecords.map((record, index) => (
                    <li key={index} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4 mb-4 sm:mb-0">
                            <div className="bg-teal-50 p-3 rounded-full">
                                <FileIcon />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 break-all">
                                    IPFS Hash: <span className="font-mono text-sm text-slate-600">{record.ipfsHash}</span>
                                </p>
                                <p className="text-sm text-slate-500">
                                    Uploaded on: {formatDate(record.timestamp)}
                                </p>
                            </div>
                        </div>
                        <a
                            href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                        >
                            View on IPFS
                            <ExternalLinkIcon />
                        </a>
                    </li>
                ))}
            </ul>

            {/* --- Pagination Controls --- */}
            {totalPages > 1 && (
                <div className="p-4 flex items-center justify-between border-t border-slate-200">
                    <button 
                        onClick={handlePrevPage} 
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-slate-500">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={handleNextPage} 
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
