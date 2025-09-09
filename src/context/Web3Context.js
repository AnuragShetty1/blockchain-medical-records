"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, ADAPTER_EVENTS } from "@web3auth/base";

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
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [owner, setOwner] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [records, setRecords] = useState([]);
    const [requests, setRequests] = useState([]);
    const [accessList, setAccessList] = useState([]);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [signer, setSigner] = useState(null);
    const [provider, setProvider] = useState(null);

    const clearUserSession = () => {
        setAccount(null);
        setContract(null);
        setOwner(null);
        setUserProfile(null);
        setIsRegistered(false);
        setRecords([]);
        setRequests([]);
        setAccessList([]);
        setSigner(null);
        setProvider(null);
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

    const checkAndSwitchNetwork = async (currentProvider) => {
        if (!currentProvider) return false;
        try {
            const web3Provider = new ethers.BrowserProvider(currentProvider);
            const network = await web3Provider.getNetwork();
            const currentChainId = `0x${network.chainId.toString(16)}`;

            if (currentChainId === TARGET_CHAIN_ID) return true;

            // This toast is removed as it's premature. Let MetaMask handle the prompt.
            // toast("Please switch to the Hardhat network in your wallet.");
            
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

    useEffect(() => {
        const subscribeAuthEvents = () => {
            web3auth.on(ADAPTER_EVENTS.CONNECTED, async (data) => {
                console.log("Web3Auth connected via:", web3auth.connectedAdapterName);
                setIsLoadingProfile(true);
                const web3authProvider = web3auth.provider;

                if (web3authProvider) {
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
                        toast.error("Please connect to the correct network to use the app.");
                        await disconnectWallet();
                    }
                }
                setIsLoadingProfile(false);
            });

            web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
                console.log("Web3Auth disconnected");
                clearUserSession();
            });
        };

        const init = async () => {
            try {
                subscribeAuthEvents();
                await web3auth.init();
            } catch (error) {
                console.error("Error initializing Web3Auth:", error);
                toast.error("Could not initialize authentication service.");
            } finally {
                setIsLoadingProfile(false);
            }
        };
        init();
    }, []);

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
        }
    };

    const setupUserSession = async (signerInstance, userAddress) => {
        try {
            const address = contractAddressData.MedicalRecords;
            const abi = medicalRecordsArtifact.abi;
            const contractInstance = new ethers.Contract(address, abi, signerInstance);

            await contractInstance.owner();

            setAccount(userAddress);
            setSigner(signerInstance);
            setContract(contractInstance);
            setOwner(await contractInstance.owner());
            await checkUserRegistration(userAddress, contractInstance);

            // Add the success toast here
            toast.success("Connected successfully!");

        } catch (error) {
            console.error("Error setting up user session:", error);
            const networkName = web3auth.connectedAdapterName === "openlogin" ? "Polygon Mumbai" : "Hardhat Local";
            toast.error(`Contract not found. Please ensure it's deployed on the ${networkName} network.`);
            await disconnectWallet();
        }
    };

    const connectWallet = async () => {
        if (!web3auth) {
            toast.error("Authentication service not ready.");
            return;
        }
        try {
            setIsLoadingProfile(true);
            await web3auth.connect();
        } catch (error) {
            console.error("Error during wallet connection:", error);
            if (!error.message.includes("User closed the modal")) {
                toast.error("Connection failed. Please try again.");
            }
        } finally {
            setIsLoadingProfile(false);
        }
    };

    useEffect(() => {
        if (contract && account) {
            const handleAccessRequested = (requestId, patientAddress, providerAddress, claimId) => {
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    addNotification(`An insurance provider has requested access for claim #${claimId}.`);
                    setTimeout(() => fetchPendingRequests(account, contract), 1000);
                }
            };

            const handleRecordAdded = (patientAddress) => {
                if (patientAddress.toLowerCase() === account.toLowerCase()) {
                    addNotification("A new medical record was successfully uploaded.");
                }
            };

            const handleUserVerified = (adminAddress, verifiedUserAddress) => {
                if (verifiedUserAddress.toLowerCase() === account.toLowerCase()) {
                    addNotification("Congratulations! Your account has been verified by an admin.");
                    checkUserRegistration(account, contract);
                }
            };

            contract.on('AccessRequested', handleAccessRequested);
            contract.on('RecordAdded', handleRecordAdded);
            contract.on('UserVerified', handleUserVerified);

            return () => {
                contract.off('AccessRequested', handleAccessRequested);
                contract.off('RecordAdded', handleRecordAdded);
                contract.off('UserVerified', handleUserVerified);
            };
        }
    }, [contract, account]);

    return (
        <Web3Context.Provider value={{ signer, account, contract, owner, isRegistered, userProfile, records, requests, accessList, isLoadingProfile, notifications, connectWallet, disconnectWallet, checkUserRegistration, fetchPendingRequests, fetchAccessList, markNotificationsAsRead }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    return useContext(Web3Context);
};


