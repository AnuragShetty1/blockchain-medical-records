"use client";

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import RecordList from './RecordList';

export default function DoctorView() {
    const { contract, account } = useWeb3(); // Get doctor's own account
    const [patientAddress, setPatientAddress] = useState('');
    const [patientRecords, setPatientRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFetchRecords = async (e) => {
        e.preventDefault();
        if (!patientAddress || !contract || !account) return;

        setIsLoading(true);
        setMessage(`Fetching records for patient ${patientAddress}...`);
        setPatientRecords([]);

        try {
            // NEW DEBUGGING STEP: Check for access BEFORE trying to fetch
            const hasAccess = await contract.checkAccess(patientAddress, account);
            console.log(`DEBUG: Checking access. Patient: ${patientAddress}, Doctor: ${account}. Has Access: ${hasAccess}`);

            if (!hasAccess) {
                setMessage("Cannot fetch: You do not have permission according to the contract.");
                setIsLoading(false);
                return;
            }

            const records = await contract.getPatientRecords(patientAddress);
            setPatientRecords(records);
            setMessage(records.length > 0 ? `Found ${records.length} record(s).` : "No records found for this patient.");
        } catch (error) {
            console.error("Failed to fetch records:", error);
            setMessage("Could not fetch records. The contract reverted the call.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl">
            <div className="p-8 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">View Patient Records</h3>
                <form onSubmit={handleFetchRecords} className="space-y-4">
                    <input
                        type="text"
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                        placeholder="Enter Patient's Wallet Address (0x...)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-bold text-white bg-teal-500 rounded-md hover:bg-teal-600 disabled:bg-gray-400">
                        {isLoading ? 'Fetching...' : 'Fetch Records'}
                    </button>
                </form>
                {message && <p className="mt-4 text-sm text-center text-gray-600">{message}</p>}
            </div>

            {patientRecords.length > 0 && <RecordList records={patientRecords} />}
        </div>
    );
}
