"use client";

import { useWeb3 } from "@/context/Web3Context";

export default function RecordList() {
    const { records } = useWeb3();

    if (records.length === 0) {
        return (
            <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner text-center">
                <p className="text-gray-500">You have no medical records yet.</p>
            </div>
        );
    }

    return (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Medical Records</h3>
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
