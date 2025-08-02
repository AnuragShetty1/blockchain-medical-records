"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

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
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const addNotification = (message) => {
        const newNotification = {
            id: Date.now() + Math.random(),
            message,
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev]);
    };
    
    const markNotificationsAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const fetchAccessList = async (userAddress, contractInstance) => {
        try {
            const addresses = await contractInstance.getAccessList(userAddress);
            const userPromises = addresses.map(address => contractInstance.users(address));
            const userDetails = await Promise.all(userPromises);
            setAccessList(userDetails);
        } catch (error) {
            console.error("Could not fetch access list:", error);
        }
    };

    const fetchPendingRequests = async (userAddress, contractInstance) => {
        try {
            const count = await contractInstance.getPatientRequestsCount(userAddress);
            const pendingReqs = [];
            for (let i = 0; i < count; i++) {
                const req = await contractInstance.getPatientRequestAtIndex(userAddress, i);
                if (Number(req.status) === 0) {
                    pendingReqs.push(req);
                }
            }
            setRequests(pendingReqs);
        } catch (error) {
            console.error("Could not fetch requests:", error);
        }
    };

    const checkUserRegistration = async (signerAddress, contractInstance) => {
        try {
            const user = await contractInstance.users(signerAddress);
            if (user.walletAddress !== ethers.ZeroAddress) {
                const profile = await contractInstance.userProfiles(signerAddress);
                setUserProfile({
                    walletAddress: user.walletAddress,
                    role: user.role,
                    isVerified: user.isVerified,
                    name: profile.name,
                    contactInfo: profile.contactInfo,
                    profileMetadataURI: profile.profileMetadataURI,
                });
                setIsRegistered(true);
                if (Number(user.role) === 0) {
                    const patientRecords = await contractInstance.getPatientRecords(signerAddress);
                    setRecords(patientRecords);
                    await fetchPendingRequests(signerAddress, contractInstance);
                    await fetchAccessList(signerAddress, contractInstance);
                }
            } else {
                setIsRegistered(false);
                setUserProfile(null);
            }
        } catch (error) {
            console.error("!!! CRITICAL ERROR in checkUserRegistration !!!", error);
            setIsRegistered(false);
            setUserProfile(null);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const connectWallet = async () => {
        const address = contractAddressData.MedicalRecords;
        const abi = medicalRecordsArtifact.abi;
        if (window.ethereum) {
            try {
                setIsLoadingProfile(true);
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
                setIsLoadingProfile(false);
            }
        } else {
            alert('Please install MetaMask!');
        }
    };

    // [FIX] Modified this useEffect to prevent duplicate listeners.
    useEffect(() => {
        // Only set up listeners if we have a contract connection and a user account.
        if (contract && account) {
            console.log("Setting up event listeners... (This should now run only once per connection)");

            const handleAccessRequested = (requestId, patientAddress, providerAddress, claimId) => {
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    console.log("Notification: Access Requested");
                    addNotification(`An insurance provider has requested access for claim #${claimId}.`);
                    setTimeout(() => fetchPendingRequests(account, contract), 1000);
                }
            };

            const handleRecordAdded = (patientAddress) => {
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    console.log("Notification: Record Added");
                    addNotification("A new medical record was successfully uploaded.");
                }
            };
            
            const handleUserVerified = (adminAddress, verifiedUserAddress) => {
                if (verifiedUserAddress.toLowerCase() === account.toLowerCase()) {
                    console.log("Notification: You've been verified!");
                    addNotification("Congratulations! Your account has been verified by an admin.");
                    checkUserRegistration(account, contract);
                }
            };

            contract.on('AccessRequested', handleAccessRequested);
            contract.on('RecordAdded', handleRecordAdded);
            contract.on('UserVerified', handleUserVerified);

            return () => {
                console.log("Removing event listeners...");
                contract.off('AccessRequested', handleAccessRequested);
                contract.off('RecordAdded', handleRecordAdded);
                contract.off('UserVerified', handleUserVerified);
            };
        }
    // [FIX] The dependency array is changed. It no longer depends on `userProfile`.
    // This ensures the listeners are not re-added every time the profile is updated.
    }, [contract, account]);

    return (
        <Web3Context.Provider value={{ account, contract, owner, isRegistered, userProfile, records, requests, accessList, isLoadingProfile, notifications, connectWallet, checkUserRegistration, fetchPendingRequests, fetchAccessList, markNotificationsAsRead }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};