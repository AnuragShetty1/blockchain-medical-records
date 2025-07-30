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
    const [accessList, setAccessList] = useState([]);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false); // New state for initial loading

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
                    await fetchAccessList(signerAddress, contractInstance);
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
        } finally {
            setIsLoadingProfile(false); // Set loading to false after check is complete
        }
    };

    const connectWallet = async () => {
        const address = contractAddressData.MedicalRecords;
        const abi = medicalRecordsArtifact.abi;
        if (window.ethereum) {
            try {
                setIsLoadingProfile(true); // Set loading to true when connection starts
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = accounts[0];
                setAccount(account);

                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await web3Provider.getSigner();
                const contractInstance = new ethers.Contract(address, abi, signer);
                setContract(contractInstance);

                const contractOwner = await contractInstance.owner();
                setOwner(contractOwner);

                await checkUserRegistration(account, contractInstance);

            } catch (error) {
                console.error("Error in connectWallet function:", error);
                setIsLoadingProfile(false); // Also set to false on error
            }
        } else {
            alert('Please install MetaMask!');
        }
    };

    useEffect(() => {
        if (contract && account) {
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

            const handleRequestApproved = (requestId, patientAddress) => {
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    setTimeout(() => {
                       fetchAccessList(account, contract);
                    }, 1000);
                }
            };

            contract.on('UserVerified', handleUserVerified);
            contract.on('AccessRequested', handleAccessRequested);
            contract.on('RequestApproved', handleRequestApproved);

            return () => {
                contract.off('UserVerified', handleUserVerified);
                contract.off('AccessRequested', handleAccessRequested);
                contract.off('RequestApproved', handleRequestApproved);
            };
        }
    }, [contract, account]);

    return (
        <Web3Context.Provider value={{ account, contract, owner, isRegistered, userProfile, records, requests, accessList, isLoadingProfile, connectWallet, checkUserRegistration, fetchPendingRequests, fetchAccessList }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};
