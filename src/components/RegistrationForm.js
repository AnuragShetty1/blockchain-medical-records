"use client";

import { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import toast from 'react-hot-toast';

const roles = [
    { id: 0, name: 'Patient', description: 'The owner of the medical records.', icon: 'M12 12a5 5 0 110-10 5 5 0 010 10zm0-2a3 3 0 100-6 3 3 0 000 6z' },
    { id: 1, name: 'Doctor', description: 'A verified healthcare professional.', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 10V9a2 2 0 00-2-2h-3m-4 0V4a2 2 0 012-2h4a2 2 0 012 2v2' },
    { id: 3, name: 'Insurance Provider', description: 'An entity that can request access for claims.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 4, name: 'Pharmacist', description: 'Dispenses medications and prescriptions.', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 5, name: 'Researcher', description: 'Accesses anonymized data for studies.', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { id: 6, name: 'Guardian', description: 'A legal representative for a patient.', icon: 'M12 15l-4 4m0 0l-4-4m4 4V3' },
];

export default function RegistrationForm() {
    // MODIFIED: Added generateAndSetKeyPair
    const { contract, account, checkUserRegistration, generateAndSetKeyPair } = useWeb3(); 
    const [name, setName] = useState('');
    const [selectedRole, setSelectedRole] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const scrollContainerRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 5);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', handleScroll);
            handleScroll();
            return () => {
                container.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', handleScroll);
            }
        }
    }, []);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!contract || !account) {
            toast.error('Please connect your wallet first.');
            return;
        }
        if (!name) {
            toast.error('Please enter your name.');
            return;
        }
        if (selectedRole === null) {
            toast.error('Please select a role.');
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading('Submitting registration transaction...');

        try {
            const tx = await contract.registerUser(name, selectedRole);
            await tx.wait();
            
            // NEW STEP: Generate and store the key pair after registration is confirmed.
            await generateAndSetKeyPair();

            toast.success('Registration successful! Please wait...', { id: toastId });
            
            // This will now correctly detect that the user needs to save their new key.
            await checkUserRegistration();

        } catch (error) {
            console.error("Registration failed:", error);
            toast.error("Registration failed. The address may already be registered.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-slate-200">
            <h2 className="text-3xl font-bold text-center text-slate-900">Create Your Account</h2>
            <p className="text-center text-slate-500">First, choose your primary role in the ecosystem.</p>

            <div className="relative">
                {showLeftArrow && (
                    <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-slate-800/60 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-slate-800/80 transition-all">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                )}
                <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto p-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRole(role.id)}
                            className={`flex-shrink-0 w-40 p-4 border rounded-lg text-center transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-1 ${selectedRole === role.id ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500' : 'border-slate-300 bg-slate-50'}`}
                        >
                            <svg className={`w-8 h-8 mx-auto mb-2 ${selectedRole === role.id ? 'text-teal-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={role.icon}></path></svg>
                            <h3 className="font-semibold text-slate-800">{role.name}</h3>
                            <p className="text-xs text-slate-500 h-10">{role.description}</p>
                        </button>
                    ))}
                </div>
                {showRightArrow && (
                    <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-slate-800/60 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-slate-800/80 transition-all">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="relative">
                    <svg className="w-6 h-6 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <input 
                        id="name" 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500" 
                        placeholder="Enter your full name"
                        required 
                    />
                </div>
                <div>
                    <button type="submit" disabled={isLoading} className="w-full px-4 py-3 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 transition-colors shadow-lg hover:shadow-xl">
                        {isLoading ? 'Processing...' : 'Create On-Chain Identity'}
                    </button>
                </div>
            </form>
        </div>
    );
}
