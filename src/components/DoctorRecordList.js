"use client";

import { format } from 'date-fns';

const DocumentIcon = () => <svg className="w-8 h-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;


/**
 * A read-only component for doctors to view the metadata of a patient's records.
 * It does not include any decryption functionality, maintaining patient privacy.
 */
export default function DoctorRecordList({ records }) {
    if (!records || records.length === 0) {
        return <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">No records found for this patient.</div>;
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 mt-8">
             <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Patient's Medical Records</h3>
                <p className="text-slate-500 mt-1">Showing all records you have been granted access to.</p>
            </div>
            <div className="divide-y divide-slate-200">
                {records.map((record) => (
                    <div key={record.ipfsHash} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <DocumentIcon />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-md text-slate-800 truncate" title={record.description}>
                                    {record.description}
                                </p>
                                <p className="text-sm text-slate-500 mt-1 truncate" title={record.fileName}>
                                    Original File: {record.fileName}
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                    Uploaded on: {record.timestamp ? format(new Date(record.timestamp * 1000), "PPpp") : 'N/A'}
                                </p>
                            </div>
                        </div>
                        <a 
                            href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-4 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-100 rounded-full hover:bg-teal-200 transition-colors"
                        >
                            View Metadata
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
