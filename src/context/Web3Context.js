"use client"; // This is a Next.js directive that marks this as a Client Component

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '@/config';

// Create the context
const Web3Context = createContext();

// Create the provider component
export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                // Request account access
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = accounts[0];
                setAccount(account);

                // Create an ethers provider using the new v6 syntax
                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(web3Provider);

                // Get the signer (the user who is connected)
                const signer = await web3Provider.getSigner();

                // Create a contract instance
                const contractInstance = new ethers.Contract(contractAddress, contractABI, signer);
                setContract(contractInstance);

            } catch (error) {
                console.error("Error connecting wallet:", error);
            }
        } else {
            alert('Please install MetaMask!');
        }
    };

    return (
        <Web3Context.Provider value={{ account, contract, provider, connectWallet }}>
            {children}
        </Web3Context.Provider>
    );
};

// Custom hook to use the context
export const useWeb3 = () => {
    return useContext(Web3Context);
};
