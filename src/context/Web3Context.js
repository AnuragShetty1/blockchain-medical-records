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

    const checkUserRegistration = async (signerAddress, contractInstance) => {
        console.log("DEBUG: [checkUserRegistration] Called for address:", signerAddress);
        try {
            const user = await contractInstance.users(signerAddress);
            if (user.walletAddress !== ethers.ZeroAddress) {
                console.log("DEBUG: User IS registered.");
                setUserProfile(user);
                setIsRegistered(true);

                if (Number(user.role) === 0) {
                    const patientRecords = await contractInstance.getPatientRecords(signerAddress);
                    setRecords(patientRecords);
                }
            } else {
                console.log("DEBUG: User IS NOT registered.");
                setIsRegistered(false);
                setUserProfile(null);
                setRecords([]);
            }
        } catch (error) {
            console.error("!!! CRITICAL ERROR in checkUserRegistration !!!", error);
        }
    };

    const connectWallet = async () => {
        const address = contractAddressData.MedicalRecords;
        const abi = medicalRecordsArtifact.abi;
        console.log(`--- ATTEMPTING TO CONNECT TO CONTRACT AT ADDRESS: ${address} ---`);

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

    // --- NEW: REAL-TIME EVENT LISTENER ---
    useEffect(() => {
        // Only set up the listener if we have a contract and an account
        if (contract && account) {
            console.log("DEBUG: Setting up event listener for UserVerified...");

            const handleUserVerified = (adminAddress, verifiedUserAddress) => {
                console.log(`DEBUG: UserVerified event received! Admin: ${adminAddress}, Verified User: ${verifiedUserAddress}`);

                // Check if the event is about the currently logged-in user
                if (verifiedUserAddress.toLowerCase() === account.toLowerCase()) {
                    console.log("DEBUG: This event is for me! Refreshing my profile...");
                    // Re-run the checkUserRegistration function to get the updated profile
                    checkUserRegistration(account, contract);
                }
            };

            // Subscribe to the event
            contract.on('UserVerified', handleUserVerified);

            // This is a cleanup function that runs when the component unmounts
            // It's crucial for preventing memory leaks
            return () => {
                console.log("DEBUG: Cleaning up event listener.");
                contract.off('UserVerified', handleUserVerified);
            };
        }
    }, [contract, account]); // This effect re-runs whenever the contract or account changes

    return (
        <Web3Context.Provider value={{ account, contract, isRegistered, userProfile, records, connectWallet, checkUserRegistration }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};
