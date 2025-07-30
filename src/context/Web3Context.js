"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';

import contractAddressData from '@/contracts/contract-address.json';
import medicalRecordsArtifact from '@/contracts/MedicalRecords.json';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [records, setRecords] = useState([]);
    const [requests, setRequests] = useState([]);

    const fetchPendingRequests = async (userAddress, contractInstance) => {
        try {
            console.log("DEBUG: Fetching pending requests...");
            const count = await contractInstance.getPatientRequestsCount(userAddress);
            console.log(`DEBUG: Found ${Number(count)} total requests. Fetching details...`);

            const pendingReqs = [];
            for (let i = 0; i < count; i++) {
                const req = await contractInstance.getPatientRequestAtIndex(userAddress, i);
                // --- THIS IS THE FIX ---
                // Convert the status from a BigInt to a Number before checking
                if (Number(req.status) === 0) { // 0 is Pending
                    pendingReqs.push(req);
                }
            }

            setRequests(pendingReqs);
            console.log("DEBUG: Found pending requests:", pendingReqs);
        } catch (error) {
            console.error("Could not fetch requests:", error);
        }
    };

    const checkUserRegistration = async (signerAddress, contractInstance) => {
        console.log("DEBUG: [checkUserRegistration] Called for address:", signerAddress);
        try {
            const user = await contractInstance.users(signerAddress);
            console.log("DEBUG: 'users' mapping call successful. User data:", user);

            if (user.walletAddress !== ethers.ZeroAddress) {
                console.log("DEBUG: User IS registered.");
                setUserProfile(user);
                setIsRegistered(true);

                if (Number(user.role) === 0) {
                    console.log("DEBUG: User is a Patient. Attempting to call 'getPatientRecords'...");
                    const patientRecords = await contractInstance.getPatientRecords(signerAddress);
                    console.log("DEBUG: 'getPatientRecords' call successful. Records:", patientRecords);
                    setRecords(patientRecords);
                    await fetchPendingRequests(signerAddress, contractInstance);
                }
            } else {
                console.log("DEBUG: User IS NOT registered.");
                setIsRegistered(false);
                setUserProfile(null);
                setRecords([]);
                setRequests([]);
            }
        } catch (error) {
            console.error("!!! CRITICAL ERROR in checkUserRegistration !!!", error);
            setIsRegistered(false);
            setUserProfile(null);
            setRecords([]);
            setRequests([]);
        }
    };

    const connectWallet = async () => {
        const address = contractAddressData.MedicalRecords;
        const abi = medicalRecordsArtifact.abi;
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = accounts[0];
                setAccount(account);

                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await web3Provider.getSigner();
                const contractInstance = new ethers.Contract(address, abi, signer);
                setContract(contractInstance);

                await checkUserRegistration(account, contractInstance);

            } catch (error) {
                console.error("Error in connectWallet function:", error);
            }
        } else {
            alert('Please install MetaMask!');
        }
    };

    useEffect(() => {
        if (contract && account) {
            console.log("DEBUG: Setting up event listeners...");

            const handleUserVerified = (adminAddress, verifiedUserAddress) => {
                if (verifiedUserAddress.toLowerCase() === account.toLowerCase()) {
                    checkUserRegistration(account, contract);
                }
            };

            const handleAccessRequested = (requestId, patientAddress, providerAddress, claimId) => {
                console.log(`DEBUG: AccessRequested event received for patient: ${patientAddress}`);
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    console.log("DEBUG: This request is for me! Applying delay before refreshing...");
                    setTimeout(() => {
                        console.log("DEBUG: Delay complete. Refreshing requests now.");
                        fetchPendingRequests(account, contract);
                    }, 1000);
                }
            };

            const handleRequestArrayUpdated = (patient, newLength) => {
                console.log(`%cDEBUG: RequestArrayUpdated event received! Patient: ${patient}, New Array Length: ${Number(newLength)}`, "color: lime; font-weight: bold;");
            };

            contract.on('UserVerified', handleUserVerified);
            contract.on('AccessRequested', handleAccessRequested);
            contract.on('RequestArrayUpdated', handleRequestArrayUpdated);

            return () => {
                console.log("DEBUG: Cleaning up event listeners.");
                contract.off('UserVerified', handleUserVerified);
                contract.off('AccessRequested', handleAccessRequested);
                contract.off('RequestArrayUpdated', handleRequestArrayUpdated);
            };
        }
    }, [contract, account]);

    return (
        <Web3Context.Provider value={{ account, contract, isRegistered, userProfile, records, requests, connectWallet, checkUserRegistration, fetchPendingRequests }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};
