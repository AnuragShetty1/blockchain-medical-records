"use client";

import { Fragment, useRef, useEffect } from 'react';

// --- Icons (embedded as SVG for portability) ---

// Warning Icon
const ExclamationTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
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
    const modalPanelRef = useRef(null);
    const cancelButtonRef = useRef(null);

    // Dynamic classes for the confirm button
    const confirmButtonClasses = `inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors
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
        // We check if the click is directly on the backdrop (the outer-most div)
        if (modalPanelRef.current && !modalPanelRef.current.contains(e.target)) {
            if (!isLoading) {
                onClose();
            }
        }
    };
    
    // Render nothing if the modal is not open
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
            {/* --- THIS LINE IS CHANGED --- */}
            {/* Backdrop Overlay: Now has a semi-transparent dark bg and a backdrop blur */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity" />

            <div 
                className="fixed inset-0 z-10 w-screen overflow-y-auto"
                onClick={handleBackdropClick} // Add click handler to the backdrop
            >
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    
                    {/* Modal Panel */}
                    <div 
                        ref={modalPanelRef} // Add ref to the panel
                        className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                    >
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                {/* Icon */}
                                <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full 
                                    ${confirmColor.includes('red') ? 'bg-red-100' : 'bg-blue-100'} sm:mx-0 sm:h-10 sm:w-10`}>
                                    <ExclamationTriangleIcon />
                                </div>
                                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    {/* Title */}
                                    <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                                        {title}
                                    </h3>
                                    {/* Message */}
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            {message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Buttons */}
                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button
                                type="button"
                                className={confirmButtonClasses}
                                onClick={onConfirm}
                                disabled={isLoading}
                            >
                                {isLoading && <SpinnerIcon />}
                                {confirmText}
                            </button>
                            <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
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
        </div>
    );
}

