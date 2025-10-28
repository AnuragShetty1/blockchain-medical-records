"use client";

import { Fragment, useRef, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context'; // <-- 1. IMPORT THEME CONTEXT

// --- Icons (embedded as SVG for portability) ---

// Warning Icon
const ExclamationTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"> {/* Color class moved to dynamic application */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

// Loading Spinner Icon
const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


/**
 * A reusable confirmation modal component (dependency-free).
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is open.
 * @param {function} props.onClose - Function to call when the modal is closed (Cancel).
 * @param {function} props.onConfirm - Function to call when the action is confirmed.
 * @param {string} props.title - The title of the modal.
 * @param {string} props.message - The confirmation message.
 * @param {string} [props.confirmText='Confirm'] - Text for the confirm button.
 * @param {string} [props.confirmColor='bg-indigo-600'] - Tailwind color for the confirm button.
 * @param {boolean} [props.isLoading=false] - Shows a loading spinner on the confirm button.
 */
export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    confirmColor = 'bg-indigo-600',
    isLoading = false
}) {
    const { theme } = useWeb3(); // <-- 2. GET THE CURRENT THEME
    const modalPanelRef = useRef(null);
    const cancelButtonRef = useRef(null);

    // --- 3. DEFINE THEME-BASED STYLES ---
    const isDarkTheme = theme === 'dark'; // Super Admin uses dark theme

    const panelClasses = isDarkTheme
        ? "bg-white text-slate-900" // White modal for dark background
        : "bg-slate-800 text-slate-100"; // Dark modal for light background

    const titleClasses = isDarkTheme
        ? "text-base font-semibold leading-6 text-gray-900"
        : "text-base font-semibold leading-6 text-slate-100";

    const messageClasses = isDarkTheme
        ? "text-sm text-gray-500"
        : "text-sm text-slate-400";

    // Determine icon colors based on confirm button color AND theme
    const isWarningAction = confirmColor.includes('red') || confirmColor.includes('amber');
    const iconBgClasses = isWarningAction
        ? (isDarkTheme ? 'bg-red-100' : 'bg-red-900/50') // Reddish background
        : (isDarkTheme ? 'bg-blue-100' : 'bg-blue-900/50'); // Bluish background for others
    const iconColorClasses = isWarningAction
        ? (isDarkTheme ? 'text-red-600' : 'text-red-400') // Reddish icon
        : (isDarkTheme ? 'text-blue-600' : 'text-blue-400'); // Bluish icon

    const buttonAreaClasses = isDarkTheme
        ? "bg-gray-50" // Light gray footer for dark theme
        : "bg-slate-700"; // Dark footer for light theme

    const cancelButtonClasses = isDarkTheme
        ? "mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
        : "mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm ring-1 ring-inset ring-slate-500 hover:bg-slate-500 sm:mt-0 sm:w-auto"; // Adjusted dark theme cancel button

    const confirmButtonClasses = `inline-flex w-full justify-center items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors
        ${isLoading
            ? 'bg-opacity-70 ' + confirmColor
            : 'hover:bg-opacity-80 ' + confirmColor
        }
        sm:ml-3 sm:w-auto`;


    // Set focus to the cancel button when the modal opens
    useEffect(() => {
        if (isOpen && cancelButtonRef.current) {
            cancelButtonRef.current.focus();
        }
    }, [isOpen]);

    // Handle closing when clicking outside the modal panel
    const handleBackdropClick = (e) => {
        if (modalPanelRef.current && !modalPanelRef.current.contains(e.target)) {
            if (!isLoading) {
                onClose();
            }
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="relative z-50"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            {/* Overlay */}
            <div
                className="fixed inset-0 z-10 w-screen overflow-y-auto transition-opacity duration-300 ease-out animate-fade-in"
                // Transparent overlay for click handling, no visual effect needed here
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.0)' }}
                onClick={handleBackdropClick}
            >
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">

                    {/* Modal Panel - Apply theme classes */}
                    <div
                        ref={modalPanelRef}
                        className={`relative transform overflow-hidden rounded-lg ${panelClasses} text-left shadow-xl transition-all duration-300 ease-out sm:my-8 sm:w-full sm:max-w-lg animate-slide-up`}
                    >
                        <div className={`px-4 pb-4 pt-5 sm:p-6 sm:pb-4 ${isDarkTheme ? 'bg-white' : 'bg-slate-800'}`}> {/* Ensure content bg matches panel */}
                            <div className="sm:flex sm:items-start">
                                {/* Icon - Apply theme classes */}
                                <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${iconBgClasses} sm:mx-0 sm:h-10 sm:w-10`}>
                                    <ExclamationTriangleIcon className={iconColorClasses}/> {/* Pass color class */}
                                </div>
                                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    {/* Title - Apply theme classes */}
                                    <h3 className={titleClasses} id="modal-title">
                                        {title}
                                    </h3>
                                    {/* Message - Apply theme classes */}
                                    <div className="mt-2">
                                        <p className={messageClasses}>
                                            {message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Buttons - Apply theme classes to area and cancel button */}
                        <div className={`px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 ${buttonAreaClasses}`}>
                            <button
                                type="button"
                                className={confirmButtonClasses}
                                onClick={onConfirm}
                                disabled={isLoading}
                            >
                                {isLoading && <SpinnerIcon />}
                                {isLoading ? 'Processing...' : confirmText}
                            </button>
                            <button
                                type="button"
                                className={cancelButtonClasses}
                                onClick={onClose}
                                ref={cancelButtonRef}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
             {/* Simple CSS Animation for fade-in and slide-up (No changes needed here) */}
             <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0.5; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}

