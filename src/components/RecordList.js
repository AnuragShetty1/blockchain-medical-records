"use client";
import { useWeb3 } from "@/context/Web3Context";

// Now accepts a 'records' prop. If not provided, it falls back to the context.
export default function RecordList({ records: recordsProp }) {
    const { records: recordsFromContext } = useWeb3();
    const records = recordsProp || recordsFromContext; // Use prop if available

    if (!records || records.length === 0) {
        return (
            <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner text-center">
                <p className="text-gray-500">No medical records to display.</p>
            </div>
        );
    }

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Medical Records</h3>
            <div className="space-y-4">
                {records.map((record, index) => (
                    <div key={index} className="p-4 bg-white rounded-md shadow-sm flex justify-between items-center">
                        <div>
                            <p className="font-mono text-sm text-gray-700 break-all">
                                IPFS Hash: {record.ipfsHash}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Uploaded on: {new Date(Number(record.timestamp) * 1000).toLocaleString()}
                            </p>
                        </div>
                        <a
                            href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 px-3 py-1 bg-teal-500 text-white text-sm font-semibold rounded-full hover:bg-teal-600"
                        >
                            View
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
