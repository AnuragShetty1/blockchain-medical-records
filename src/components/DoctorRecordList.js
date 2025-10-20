"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';
import { unwrapSymmetricKey } from '@/utils/crypto';
import { Eye, Loader2, FileText, AlertTriangle } from 'lucide-react';


function RecordMetadataCell({ record, metadataCache, setMetadataCache }) {
    const metadata = metadataCache[record.recordId];

    useEffect(() => {
        if (!metadata && !metadataCache.hasOwnProperty(record.recordId)) {
            const fetchMetadata = async () => {
                try {
                    const response = await fetch(`https://ipfs.io/ipfs/${record.ipfsHash}`);
                    if (!response.ok) throw new Error('Failed to fetch metadata.');
                    const data = await response.json();
                    setMetadataCache(prev => ({ ...prev, [record.recordId]: data || null }));
                } catch (error) {
                    setMetadataCache(prev => ({ ...prev, [record.recordId]: null }));
                }
            };
            fetchMetadata();
        }
    }, [record.recordId, record.ipfsHash, metadata, metadataCache, setMetadataCache]);

    if (metadata === undefined) return <div className="h-5 bg-slate-200 rounded w-3/4 animate-pulse"></div>;
    if (metadata === null) return <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4" /><span>Metadata Failed</span></div>;

    return <span title={metadata.title}>{metadata.title || "Untitled Record"}</span>;
}

export default function DoctorRecordList({ records }) {
    const { keyPair } = useWeb3();
    const [decryptingId, setDecryptingId] = useState(null);
    const [metadataCache, setMetadataCache] = useState({});

    const handleViewRecord = async (record) => {
        if (!keyPair?.privateKey) return toast.error("Security keys not loaded.");

        const metadata = metadataCache[record.recordId];
        if (!metadata) return toast.error("Record details are still loading.");

        setDecryptingId(record.recordId);
        const toastId = toast.loading("Fetching encrypted file...");
        try {
            const bundleHash = metadata.encryptedBundleIPFSHash;
            if (!bundleHash) throw new Error("Encrypted file hash is missing.");
            
            const bundleResponse = await fetch(`https://ipfs.io/ipfs/${bundleHash}`);
            if (!bundleResponse.ok) throw new Error("Could not fetch encrypted file from IPFS.");
            const encryptedBundle = await bundleResponse.json();

            toast.loading("Unwrapping secure key...", { id: toastId });
            const symmetricKey = await unwrapSymmetricKey(record.rewrappedKey, encryptedBundle.iv, keyPair.privateKey);

            toast.loading("Decrypting file...", { id: toastId });
            const decryptedData = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(encryptedBundle.iv) },
                symmetricKey,
                new Uint8Array(encryptedBundle.encryptedData)
            );

            const blob = new Blob([decryptedData], { type: metadata.fileType || 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            URL.revokeObjectURL(url);
            
            toast.success("Record decrypted!", { id: toastId });
        } catch (error) {
            toast.error(error.message || "Could not decrypt the record.", { id: toastId });
        } finally {
            setDecryptingId(null);
        }
    };

    if (!records || records.length === 0) {
        return (
            <div className="text-center p-8 text-slate-500 bg-slate-50">
                <FileText className="h-10 w-10 mx-auto text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-700 mt-2">No Records Found</h3>
                <p className="mt-1">This patient has not shared any records with you.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                    <tr>
                        <th className="px-4 py-2 font-semibold text-slate-600">Record Title</th>
                        <th className="px-4 py-2 font-semibold text-slate-600">Category</th>
                        <th className="px-4 py-2 font-semibold text-slate-600">Shared On</th>
                        <th className="relative px-4 py-2"><span className="sr-only">View</span></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {records.map((record) => {
                        const metadata = metadataCache[record.recordId];
                        return (
                            <tr key={record.recordId} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                                    <RecordMetadataCell record={record} metadataCache={metadataCache} setMetadataCache={setMetadataCache} />
                                </td>
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                    {metadata === undefined ? <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div> : (
                                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">
                                            {metadata?.category || '...'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                    {record.createdAt ? format(new Date(record.createdAt), "PP") : '...'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleViewRecord(record)}
                                        disabled={decryptingId === record.recordId || metadata === undefined}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-semibold text-xs text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400 transition-colors shadow-sm"
                                    >
                                        {decryptingId === record.recordId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                        {decryptingId === record.recordId ? 'Decrypting' : 'View'}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
