"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '@/config';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [userProfile, setUserProfile] = useState(null); // New state for user profile
    const [isRegistered, setIsRegistered] = useState(false); // New state for registration status

    const checkUserRegistration = async (signerAddress, contractInstance) => {
        try {
            const user = await contractInstance.users(signerAddress);
            // The 'walletAddress' will be '0x00...000' if the user doesn't exist
            // Updated to ethers v6 syntax: ethers.ZeroAddress
            if (user.walletAddress !== ethers.ZeroAddress) {
                setUserProfile(user);
                setIsRegistered(true);
            } else {
                setIsRegistered(false);
                setUserProfile(null);
            }
        } catch (error) {
            console.error("Error checking user registration:", error);
            setIsRegistered(false);
            setUserProfile(null);
        }
    };

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = accounts[0];
                setAccount(account);

                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(web3Provider);

                const signer = await web3Provider.getSigner();
                const contractInstance = new ethers.Contract(contractAddress, contractABI, signer);
                setContract(contractInstance);

                // After connecting, immediately check if the user is registered
                await checkUserRegistration(account, contractInstance);

            } catch (error) {
                console.error("Error connecting wallet:", error);
            }
        } else {
            alert('Please install MetaMask!');
        }
    };

    return (
        <Web3Context.Provider value={{ account, contract, provider, isRegistered, userProfile, connectWallet, checkUserRegistration }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};
