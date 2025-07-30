"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';

import contractAddressData from '@/contracts/contract-address.json';
import medicalRecordsArtifact from '@/contracts/MedicalRecords.json';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [owner, setOwner] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [records, setRecords] = useState([]);
    const [requests, setRequests] = useState([]);
    const [accessList, setAccessList] = useState([]); // New state for the access list

    // New function to fetch the access list
    const fetchAccessList = async (userAddress, contractInstance) => {
        try {
            console.log("DEBUG: Fetching access list...");
            const list = await contractInstance.getAccessList(userAddress);
            setAccessList(list);
            console.log("DEBUG: Found access list:", list);
        } catch (error) {
            console.error("Could not fetch access list:", error);
        }
    };

    const fetchPendingRequests = async (userAddress, contractInstance) => {
        try {
            console.log("DEBUG: Fetching pending requests...");
            const count = await contractInstance.getPatientRequestsCount(userAddress);
            console.log(`DEBUG: Found ${Number(count)} total requests. Fetching details...`);

            const pendingReqs = [];
            for (let i = 0; i < count; i++) {
                const req = await contractInstance.getPatientRequestAtIndex(userAddress, i);
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

                if (Number(user.role) === 0) { // If Patient
                    console.log("DEBUG: User is a Patient. Attempting to call 'getPatientRecords'...");
                    const patientRecords = await contractInstance.getPatientRecords(signerAddress);
                    console.log("DEBUG: 'getPatientRecords' call successful. Records:", patientRecords);
                    setRecords(patientRecords);
                    await fetchPendingRequests(signerAddress, contractInstance);
                    await fetchAccessList(signerAddress, contractInstance); // Also fetch access list on login
                }
            } else {
                console.log("DEBUG: User IS NOT registered.");
                setIsRegistered(false);
                setUserProfile(null);
                setRecords([]);
                setRequests([]);
                setAccessList([]);
            }
        } catch (error) {
            console.error("!!! CRITICAL ERROR in checkUserRegistration !!!", error);
            setIsRegistered(false);
            setUserProfile(null);
            setRecords([]);
            setRequests([]);
            setAccessList([]);
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

                const contractOwner = await contractInstance.owner();
                setOwner(contractOwner);
                console.log("DEBUG: Contract Owner is:", contractOwner);

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
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    setTimeout(() => {
                        fetchPendingRequests(account, contract);
                    }, 1000);
                }
            };

            // --- NEW EVENT LISTENER ---
            const handleRequestApproved = (requestId, patientAddress) => {
                console.log(`DEBUG: RequestApproved event received for patient: ${patientAddress}`);
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    console.log("DEBUG: My request approval was processed! Refreshing my access list...");
                    // After a request is approved, the access list changes, so we must refresh it.
                    setTimeout(() => {
                       fetchAccessList(account, contract);
                    }, 1000);
                }
            };

            contract.on('UserVerified', handleUserVerified);
            contract.on('AccessRequested', handleAccessRequested);
            contract.on('RequestApproved', handleRequestApproved); // Subscribe to new event

            return () => {
                console.log("DEBUG: Cleaning up event listeners.");
                contract.off('UserVerified', handleUserVerified);
                contract.off('AccessRequested', handleAccessRequested);
                contract.off('RequestApproved', handleRequestApproved); // Unsubscribe
            };
        }
    }, [contract, account]);

    return (
        <Web3Context.Provider value={{ account, contract, owner, isRegistered, userProfile, records, requests, accessList, connectWallet, checkUserRegistration, fetchPendingRequests, fetchAccessList }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};
