"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, ADAPTER_EVENTS } from "@web3auth/base";
import { generateAndStoreKeyPair, loadKeyPair } from '@/utils/crypto';

import contractAddressData from '@/contracts/contract-address.json';
import medicalRecordsArtifact from '@/contracts/MedicalRecords.json';

const Web3Context = createContext();

// --- CONFIGURATION ---
const hardhatChainConfig = {
    chainId: "0x7a69", // 31337 in hex
    displayName: "Hardhat Local Network",
    rpcTarget: "http://127.0.0.1:8545",
    blockExplorer: "http://localhost:3000",
    ticker: "ETH",
    tickerName: "Ethereum",
};
const TARGET_CHAIN_ID = hardhatChainConfig.chainId;

const initChainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x13881", // Polygon Mumbai
    rpcTarget: "https://rpc.ankr.com/polygon_mumbai",
    displayName: "Polygon Mumbai Testnet",
    blockExplorer: "https://mumbai.polygonscan.com/",
    ticker: "MATIC",
    tickerName: "Matic",
};

const web3auth = new Web3Auth({
    clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: "sapphire_devnet",
    chainConfig: initChainConfig,
});

export const Web3Provider = ({ children }) => {
    // Core Web3 State
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [signer, setSigner] = useState(null);
    const [provider, setProvider] = useState(null);
    const [owner, setOwner] = useState(null);

    // User & Session State
    const [userProfile, setUserProfile] = useState(null);
    const [userStatus, setUserStatus] = useState('unregistered'); // Add this new state
    const [isRegistered, setIsRegistered] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [keyPair, setKeyPair] = useState(null);
    const [needsPublicKeySetup, setNeedsPublicKeySetup] = useState(false);

    // App Data State
    const [records, setRecords] = useState([]);
    const [requests, setRequests] = useState([]);
    const [accessList, setAccessList] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // --- SESSION MANAGEMENT ---
    const clearUserSession = () => {
        setAccount(null);
        setContract(null);
        setOwner(null);
        setUserProfile(null);
        setIsRegistered(false);
        setUserStatus('unregistered');
        setRecords([]);
        setRequests([]);
        setAccessList([]);
        setSigner(null);
        setProvider(null);
        setKeyPair(null);
        setNeedsPublicKeySetup(false);
    };

    const disconnectWallet = async () => {
        if (!web3auth) return;
        try {
            await web3auth.logout();
            toast.success("You've been logged out.");
        } catch (error) {
            console.error("Error during logout:", error);
            toast.error("Logout failed.");
        }
    };
    
    // --- NETWORK SWITCHING ---
    const checkAndSwitchNetwork = async (currentProvider) => {
        if (!currentProvider) return false;
        try {
            const web3Provider = new ethers.BrowserProvider(currentProvider);
            const network = await web3Provider.getNetwork();
            const currentChainId = `0x${network.chainId.toString(16)}`;

            if (currentChainId === TARGET_CHAIN_ID) return true;
            
            try {
                await currentProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: TARGET_CHAIN_ID }],
                });
                return true;
            } catch (switchError) {
                if (switchError.code === 4902) {
                    try {
                        await currentProvider.request({
                            method: 'wallet_addEthereumChain',
                            params: [hardhatChainConfig],
                        });
                        return true;
                    } catch (addError) {
                        toast.error("Failed to add Hardhat network to wallet.");
                        console.error("Failed to add network:", addError);
                        return false;
                    }
                } else {
                    toast.error("Failed to switch network. Please do it manually in your wallet.");
                    console.error("Failed to switch network:", switchError);
                    return false;
                }
            }
        } catch (error) {
            console.error("Error checking/switching network:", error);
            return false;
        }
    };

    // --- DATA FETCHING (STABILIZED WITH useCallback) ---
    const fetchPendingRequests = useCallback(async (patientAddress, contractInstance) => {
        if (!contractInstance || !patientAddress) return;
        try {
            const count = await contractInstance.getPatientRequestsCount(patientAddress);
            const pendingReqs = [];
            for (let i = 0; i < count; i++) {
                const req = await contractInstance.getPatientRequestAtIndex(patientAddress, i);
                if (Number(req.status) === 0) {
                    pendingReqs.push(req);
                }
            }
            setRequests(pendingReqs);
        } catch (error) {
            console.error("Could not fetch access requests:", error);
        }
    }, []);

    const fetchPatientData = useCallback(async (patientAddress, contractInstance) => {
        if (!contractInstance || !patientAddress) return;
        try {
            const recordIds = await contractInstance.getPatientRecordIds(patientAddress);
            const recordsPromises = recordIds.map(id => contractInstance.getRecordById(id));
            const fetchedRecords = await Promise.all(recordsPromises);
            setRecords(fetchedRecords);
            await fetchPendingRequests(patientAddress, contractInstance);
        } catch (error) {
            console.error("Could not fetch patient data:", error);
        }
    }, [fetchPendingRequests]);

    // --- [REFACTORED] SESSION SETUP & STATE CHECKING ---
    const checkUserRegistrationAndState = useCallback(async (userAddress, contractInstance, signerInstance) => {
        setIsLoadingProfile(true);
        try {
            const response = await fetch(`http://localhost:3001/api/users/status/${userAddress}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user status from the server.');
            }
            const data = await response.json();
            
            setUserStatus(data.status);

            if (data.status !== 'unregistered') {
                setIsRegistered(true);
                // Construct a profile object that matches the old structure for compatibility
                const fullProfile = {
                    walletAddress: userAddress.toLowerCase(),
                    role: data.role,
                    isVerified: data.isVerified,
                    hospitalId: data.hospitalId,
                    publicKey: data.publicKey || "", 
                    name: data.name || "",
                };
                setUserProfile(fullProfile);

                // --- [THE FIX] ---
                // Only load the cryptographic key pair if the user is fully approved AND their role
                // requires keys. This prevents the signature request for users who are pending verification.
                const rolesThatNeedKeys = ['Patient', 'Doctor', 'LabTechnician'];
                const userIsApproved = data.status === 'approved';
                const userNeedsKey = rolesThatNeedKeys.includes(fullProfile.role);

                if (userIsApproved && userNeedsKey) {
                    const loadedKeyPair = await loadKeyPair(signerInstance);
                    setKeyPair(loadedKeyPair);
                    
                    // Check if the user needs to complete the public key setup on-chain
                    if (!fullProfile.publicKey || fullProfile.publicKey === "") {
                        setNeedsPublicKeySetup(true);
                    } else {
                        setNeedsPublicKeySetup(false);
                        // Fetch detailed patient data only if the role is Patient
                        if (fullProfile.role === "Patient") {
                            await fetchPatientData(userAddress, contractInstance);
                        }
                    }
                } else {
                    // For users who are pending, unregistered, or have roles that don't need keys (e.g., admins),
                    // ensure key-related states are reset.
                    setKeyPair(null);
                    setNeedsPublicKeySetup(false);
                }
                // --- [END FIX] ---

            } else {
                setIsRegistered(false);
                setUserProfile(null);
                setNeedsPublicKeySetup(false);
                setKeyPair(null);
            }
        } catch (error) {
            console.error("!!! CRITICAL ERROR in checkUserRegistrationAndState !!!", error);
            toast.error("Could not verify user status. Please reconnect.");
            await disconnectWallet();
        } finally {
            setIsLoadingProfile(false);
        }
    }, [fetchPatientData]);

    const setupUserSession = useCallback(async (signerInstance, userAddress) => {
        try {
            const address = contractAddressData.MedicalRecords;
            const abi = medicalRecordsArtifact.abi;
            const contractInstance = new ethers.Contract(address, abi, signerInstance);
    
            await contractInstance.owner();
    
            setAccount(userAddress);
            setSigner(signerInstance);
            setContract(contractInstance);
            setOwner(await contractInstance.owner());
            
            await checkUserRegistrationAndState(userAddress, contractInstance, signerInstance);
            
            toast.success("Connected successfully!");
        } catch (error) {
            console.error("Error setting up user session:", error);
            toast.error(`Contract not found on Hardhat network. Please deploy it and check the address.`);
            await disconnectWallet();
        }
    }, [checkUserRegistrationAndState]);

    const generateAndSetKeyPair = async () => {
        if (!signer) {
            toast.error("Signer not available. Cannot generate keys."); return;
        }
        try {
            const newKeyPair = await generateAndStoreKeyPair(signer);
            setKeyPair(newKeyPair);
            return newKeyPair;
        } catch (error) {
            console.error("Error generating key pair:", error);
            toast.error("Failed to generate security keys.");
        }
    };

    const savePublicKeyOnChain = async () => {
        if (!contract || !keyPair?.publicKey) {
            toast.error("Contract or public key not available."); return;
        }
        try {
            const tx = await contract.savePublicKey(keyPair.publicKey);
            const toastId = toast.loading("Saving your public key to the blockchain...");
            await tx.wait();
            toast.success("Security setup complete!", { id: toastId });
            // [FIX 1: IMMEDIATE STATE REFRESH] 
            // Call the checker immediately after the transaction is confirmed
            // to fetch the updated user profile (with publicKey set) from the backend.
            await checkUserRegistrationAndState(account, contract, signer);
        } catch (error) {
            console.error("Error saving public key:", error);
            toast.error("Failed to save public key.");
        }
    };
    
    const addNotification = (message) => {
        setNotifications(prev => [{ id: Date.now() + Math.random(), message, timestamp: new Date(), read: false }, ...prev]);
    };

    const markNotificationsAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };
    
    // --- WEB3AUTH INITIALIZATION & EVENT HANDLING ---
    useEffect(() => {
        const initWeb3Auth = async () => {
            try {
                web3auth.on(ADAPTER_EVENTS.CONNECTED, async (data) => {
                    setIsLoadingProfile(true);
                    const web3authProvider = web3auth.provider;
                    if (!web3authProvider) return;
                    
                    setProvider(web3authProvider);
                    let isNetworkCorrect = true;
                    if (web3auth.connectedAdapterName !== "openlogin") {
                        isNetworkCorrect = await checkAndSwitchNetwork(web3authProvider);
                    }
                    if (isNetworkCorrect) {
                        const finalProvider = new ethers.BrowserProvider(web3authProvider);
                        const signerInstance = await finalProvider.getSigner();
                        const userAddress = await signerInstance.getAddress();
                        await setupUserSession(signerInstance, userAddress);
                    } else {
                        toast.error("Please connect to the Hardhat network to use the app.");
                        await disconnectWallet();
                    }
                    setIsLoadingProfile(false);
                });
                web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
                    clearUserSession();
                });
                await web3auth.init();
            } catch (error) {
                console.error("Error initializing Web3Auth:", error);
            } finally {
                setIsLoadingProfile(false);
            }
        };
        initWeb3Auth();
    }, [setupUserSession]);
    
    const connectWallet = async () => {
        if (!web3auth) {
            toast.error("Authentication service not ready."); return;
        }
        setIsLoadingProfile(true);
        try {
            await web3auth.connect();
        } catch (error) {
            if (!error.message.includes("User closed the modal")) {
                toast.error("Connection failed. Please try again.");
            }
        } finally {
            setIsLoadingProfile(false);
        }
    };
    
    // --- EVENT LISTENERS ---
    useEffect(() => {
        if (contract && account) {
            const handleRecordAdded = async (recordId, patientAddress, category) => {
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    addNotification(`A new record in the ${category} category was added.`);
                    toast.success("New record detected! Adding to your list...");

                    try {
                        const newRecord = await contract.getRecordById(recordId);
                        setRecords(prevRecords => {
                            const recordExists = prevRecords.some(r => Number(r[0]) === Number(newRecord[0]));
                            if (recordExists) {
                                return prevRecords;
                            }
                            return [...prevRecords, newRecord];
                        });
                    } catch (error) {
                        console.error("Failed to fetch new record by ID, falling back to full refresh.", error);
                        setTimeout(() => fetchPatientData(account, contract), 1000);
                    }
                }
            };

            const handleUserVerified = (admin, verifiedUser) => {
                if (verifiedUser.toLowerCase() === account.toLowerCase()) {
                    addNotification("Congratulations! Your account has been verified.");
                    // Trigger a full state refresh to transition from PendingVerification to PublicKeySetup
                    checkUserRegistrationAndState(account, contract, signer);
                }
            };
            
            // [FIX 2: EVENT-DRIVEN REFRESH] 
            // New event handler for when the public key is saved on-chain.
            const handlePublicKeySaved = (userAddress) => {
                if (userAddress.toLowerCase() === account.toLowerCase()) {
                    addNotification("Your encryption key was securely saved on-chain!");
                    // Trigger a full state refresh to instantly move from PublicKeySetup to the correct Dashboard
                    checkUserRegistrationAndState(account, contract, signer); 
                }
            };

            contract.on('RecordAdded', handleRecordAdded);
            contract.on('UserVerified', handleUserVerified);
            contract.on('PublicKeySaved', handlePublicKeySaved); // Add new listener

            return () => {
                contract.off('RecordAdded', handleRecordAdded);
                contract.off('UserVerified', handleUserVerified);
                contract.off('PublicKeySaved', handlePublicKeySaved); // Cleanup new listener
            };
        }
    }, [contract, account, signer, fetchPatientData, checkUserRegistrationAndState]);


    return (
        <Web3Context.Provider value={{ 
            signer, account, contract, owner, isRegistered, userProfile, userStatus,
            records, requests, isLoadingProfile, notifications, keyPair, needsPublicKeySetup,
            accessList,
            connectWallet, disconnectWallet, 
            checkUserRegistration: () => checkUserRegistrationAndState(account, contract, signer),
            markNotificationsAsRead,
            generateAndSetKeyPair,
            savePublicKeyOnChain,
        }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};
