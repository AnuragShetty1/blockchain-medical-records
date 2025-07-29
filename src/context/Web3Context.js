"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '@/config';

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
            console.log("DEBUG: Attempting to call 'users' mapping...");
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
                }
            } else {
                console.log("DEBUG: User IS NOT registered.");
                setIsRegistered(false);
                setUserProfile(null);
                setRecords([]);
            }
        } catch (error) {
            console.error("!!! CRITICAL ERROR in checkUserRegistration !!!", error);
            setIsRegistered(false);
            setUserProfile(null);
            setRecords([]);
        }
    };

    const connectWallet = async () => {
        console.log("DEBUG: [connectWallet] Function called.");
        if (window.ethereum) {
            try {
                console.log("DEBUG: Requesting accounts from MetaMask...");
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                console.log("DEBUG: Accounts received:", accounts);
                const account = accounts[0];
                setAccount(account);

                console.log("DEBUG: Creating BrowserProvider...");
                const web3Provider = new ethers.BrowserProvider(window.ethereum);

                console.log("DEBUG: Getting signer...");
                const signer = await web3Provider.getSigner();
                console.log("DEBUG: Signer received:", signer);

                console.log("DEBUG: Creating contract instance...");
                const contractInstance = new ethers.Contract(contractAddress, contractABI, signer);
                setContract(contractInstance);
                console.log("DEBUG: Contract instance created.");

                await checkUserRegistration(account, contractInstance);

            } catch (error) {
                console.error("Error in connectWallet function:", error);
            }
        } else {
            console.error("MetaMask is not installed!");
            alert('Please install MetaMask!');
        }
    };

    return (
        <Web3Context.Provider value={{ account, contract, isRegistered, userProfile, records, connectWallet, checkUserRegistration }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};
