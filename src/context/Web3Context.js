/*
 * File: src/context/Web3Context.js
 * [CORRECTED]
 * This file is updated to fix a bug where the user's role was lost when combining
 * user data with profile data. The fix is in the `checkUserRegistration` function.
 * I've also added more comments to explain what's happening.
 */
"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast'; // Used for showing pop-up notifications

import contractAddressData from '@/contracts/contract-address.json';
import medicalRecordsArtifact from '@/contracts/MedicalRecords.json';

// This creates a shared space (a "Context") where all our web3 data like the user's account,
// the contract connection, and profile info will live.
const Web3Context = createContext();

// This is the main provider component. It will wrap our entire application and
// manage all the blockchain interactions.
export const Web3Provider = ({ children }) => {
    // State variables to hold our application's data.
    const [account, setAccount] = useState(null); // The user's wallet address
    const [contract, setContract] = useState(null); // The connection to our smart contract
    const [owner, setOwner] = useState(null); // The owner of the smart contract
    const [userProfile, setUserProfile] = useState(null); // The logged-in user's complete profile
    const [isRegistered, setIsRegistered] = useState(false); // Flag to check if the user is registered
    const [records, setRecords] = useState([]); // A patient's medical records
    const [requests, setRequests] = useState([]); // A patient's pending access requests
    const [accessList, setAccessList] = useState([]); // List of users who have access to a patient's data
    const [isLoadingProfile, setIsLoadingProfile] = useState(false); // A flag to show a loading state

    // Function to get the list of users who have been granted access.
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

    // Function to get any pending access requests for the patient.
    const fetchPendingRequests = async (userAddress, contractInstance) => {
        try {
            const count = await contractInstance.getPatientRequestsCount(userAddress);
            const pendingReqs = [];
            for (let i = 0; i < count; i++) {
                const req = await contractInstance.getPatientRequestAtIndex(userAddress, i);
                if (Number(req.status) === 0) { // 0 means "Pending"
                    pendingReqs.push(req);
                }
            }
            setRequests(pendingReqs);
        } catch (error) {
            console.error("Could not fetch requests:", error);
        }
    };

    // This is the main function to check if a user is registered and load all their data.
    const checkUserRegistration = async (signerAddress, contractInstance) => {
        console.log("DEBUG: Checking registration for address:", signerAddress);
        try {
            // 1. Fetch the basic user info (includes the role)
            const user = await contractInstance.users(signerAddress);

            // Check if the wallet address is not an empty address, which means the user exists.
            if (user.walletAddress !== ethers.ZeroAddress) {
                console.log("DEBUG: User is registered. Fetching detailed profile...");
                
                // 2. Fetch the detailed profile info (name, contact, etc.)
                const profile = await contractInstance.userProfiles(signerAddress);

                // 3. [THIS IS THE FIX]
                // We now explicitly combine the data from `user` and `profile` into one object.
                // This ensures the `role` from the `user` object is correctly included.
                setUserProfile({
                    walletAddress: user.walletAddress,
                    role: user.role, // This was the missing piece!
                    isVerified: user.isVerified,
                    name: profile.name, // The name from the profile can be updated
                    contactInfo: profile.contactInfo,
                    profileMetadataURI: profile.profileMetadataURI,
                });
                setIsRegistered(true);

                // 4. If the user is a Patient, fetch all their specific data.
                if (Number(user.role) === 0) { // 0 is the enum value for Patient
                    console.log("DEBUG: User is a Patient. Fetching related data...");
                    const patientRecords = await contractInstance.getPatientRecords(signerAddress);
                    setRecords(patientRecords);
                    await fetchPendingRequests(signerAddress, contractInstance);
                    await fetchAccessList(signerAddress, contractInstance);
                }
            } else {
                // If the user doesn't exist, clear all data.
                console.log("DEBUG: User is NOT registered.");
                setIsRegistered(false);
                setUserProfile(null);
                // ... reset other states
            }
        } catch (error) {
            console.error("!!! CRITICAL ERROR in checkUserRegistration !!!", error);
            // Also clear data on error.
            setIsRegistered(false);
            setUserProfile(null);
        } finally {
            // Stop the loading indicator
            setIsLoadingProfile(false);
        }
    };

    // Function to connect to the user's MetaMask wallet.
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

                // After connecting, immediately check their registration status.
                await checkUserRegistration(account, contractInstance);

            } catch (error) {
                console.error("Error in connectWallet function:", error);
                setIsLoadingProfile(false);
            }
        } else {
            alert('Please install MetaMask!');
        }
    };

    // This `useEffect` hook sets up event listeners. It runs when the component loads.
    // It listens for events from the smart contract to update the UI in real-time.
    useEffect(() => {
        if (contract && account) {
            // Listener for when a user profile is updated
            const handleProfileUpdated = (userAddress) => {
                if (userAddress.toLowerCase() === account.toLowerCase()) {
                    toast.success("Profile change detected, updating your data...");
                    checkUserRegistration(account, contract); // Re-fetch all data
                }
            };

            // Add more listeners as needed...

            // Subscribe to the event
            contract.on('ProfileUpdated', handleProfileUpdated);

            // Cleanup function: Unsubscribe when the component is removed
            return () => {
                contract.off('ProfileUpdated', handleProfileUpdated);
            };
        }
    }, [contract, account]);

    // This makes all the state variables and functions available to any component in our app.
    return (
        <Web3Context.Provider value={{ account, contract, owner, isRegistered, userProfile, records, requests, accessList, isLoadingProfile, connectWallet, checkUserRegistration, fetchPendingRequests, fetchAccessList }}>
            {children}
        </Web3Context.Provider>
    );
};

// A simple helper function to easily access the context data in any component.
export const useWeb3 = () => {
    return useContext(Web3Context);
};
