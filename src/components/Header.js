"use client";

import { useState, useEffect, useRef } from 'react';
import { useWeb3 } from "@/context/Web3Context";
import Image from 'next/image';
import Notifications from './Notifications';

const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;

export default function Header() {
    // Destructure disconnectWallet from the context
    const { account, connectWallet, disconnectWallet, userProfile, notifications } = useWeb3();
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const profileImageUrl = userProfile?.profileMetadataURI
        ? `https://gateway.pinata.cloud/ipfs/${userProfile.profileMetadataURI}`
        : '/default-avatar.svg';

    useEffect(() => {
        function handleClickOutside(event) {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [notificationRef]);

    const isPatient = userProfile && Number(userProfile.role) === 0;

    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Image
                        src="/logo.png"
                        alt="PRISM Logo"
                        width={70}
                        height={70}
                        priority
                    />
                    <span className="text-3xl font-bold text-teal-500">PRISM</span>
                </div>

                <div className="flex items-center space-x-4">
                    {userProfile && (
                        <>
                            {isPatient && (
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-600 font-semibold hidden sm:block">
                                        {userProfile.name}
                                    </span>
                                    <Image
                                        src={profileImageUrl}
                                        alt="Profile Picture"
                                        width={40}
                                        height={40}
                                        className="rounded-full object-cover w-10 h-10 border-2 border-slate-200"
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.svg'; }}
                                    />
                                </div>
                            )}
                            <div className="relative" ref={notificationRef}>
                                <button
                                    onClick={() => setShowNotifications(prev => !prev)}
                                    className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                    aria-label="Toggle Notifications"
                                >
                                    <BellIcon />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">
                                                {unreadCount}
                                            </span>
                                        </span>
                                    )}
                                </button>
                                {showNotifications && <Notifications close={() => setShowNotifications(false)} />}
                            </div>
                        </>
                    )}

                    {/* Conditional Login/Logout Button */}
                    {account ? (
                        <button
                            onClick={disconnectWallet} // Use disconnect function
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition-colors"
                        >
                            Logout
                        </button>
                    ) : (
                        <button
                            onClick={connectWallet}
                            className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-full transition-colors"
                        >
                            Login / Register
                        </button>
                    )}
                </div>
            </nav>
        </header>
    );
}

