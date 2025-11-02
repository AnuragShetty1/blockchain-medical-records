"use client";

import { useState, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context'; // Aliased path
import toast from 'react-hot-toast';
import { hybridEncrypt } from '@/utils/crypto'; // Aliased path
import { UploadCloud, File as FileIcon, X as CloseIcon, Loader2, ShieldCheck, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- (From Plan) Animation Variants ---
const formContainerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

// --- (From Plan) Helper Components ---
const AddMoreDropzone = ({ onDrop, onDragOver, onDragEnter, onDragLeave, onChange, isDragActive }) => (
    <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        className={`relative block w-full p-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${isDragActive ? 'border-blue-400 bg-slate-700' : 'border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-slate-500'}`}
    >
        <span className="text-sm font-semibold text-blue-300 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Add More Files
        </span>
        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onChange} multiple />
    </label>
);

const EncryptionAnimation = ({ fileCount }) => (
    <motion.div
        key="encrypting"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center text-center text-white h-full flex-1 py-10"
    >
        <motion.div
            animate={{
                scale: [1, 1.1, 1],
                filter: [
                    'drop-shadow(0 0 0 rgba(59, 130, 246, 0))',
                    'drop-shadow(0 0 15px rgba(59, 130, 246, 0.7))',
                    'drop-shadow(0 0 0 rgba(59, 130, 246, 0))'
                ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
            <ShieldCheck className="h-16 w-16 text-blue-400" />
        </motion.div>
        <h3 className="mt-4 text-lg font-semibold text-slate-100">
            Securing {fileCount} {fileCount === 1 ? 'File' : 'Files'}...
        </h3>
        <p className="mt-1 text-sm text-slate-400">Encrypting for doctor and patient.</p>
        <p className="mt-1 text-sm text-slate-400">Please do not close this window.</p>
    </motion.div>
);

// --- (From Plan) Initial Dropzone ---
const VerifiedVaultDropzone = ({ onDrop, onDragOver, onDragEnter, onDragLeave, onChange, isDragActive }) => (
    <motion.div
        key="dropzone"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        className={`relative block w-full flex-1 flex flex-col items-center justify-center px-6 py-10 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${isDragActive ? 'border-blue-400 bg-slate-800' : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'}`}
    >
        <UploadCloud className="w-10 h-10 mx-auto text-slate-400" />
        <span className="mt-2 block text-sm font-semibold text-slate-200">Drag files into the Verified Vault</span>
        <span className="mt-1 block text-xs text-slate-400">or click to browse</span>
        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onChange} multiple />
    </motion.div>
);


export default function VerifiedUploadForm({ patientProfile, onUploadSuccess, allowedCategories }) {
    // --- (From Plan) ADDED hasInteracted state ---
    const { api, userProfile: professionalProfile } = useWeb3();
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(allowedCategories[0]?.value || 'other');
    const [hasInteracted, setHasInteracted] = useState(false); // NEW

    // --- (From Plan) MODIFIED to set hasInteracted ---
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files?.length) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
            setHasInteracted(true); // NEW
        }
    }, []);

    // --- (From Plan) MODIFIED to set hasInteracted ---
    const handleChange = (e) => {
        if (e.target.files?.length) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
            setHasInteracted(true); // NEW
        }
    };

    // --- (Unchanged) ---
    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
    const handleDragEnter = useCallback((e) => { handleDrag(e); setIsDragActive(true); }, [handleDrag]);
    const handleDragLeave = useCallback((e) => { handleDrag(e); setIsDragActive(false); }, [handleDrag]);

    // --- (Unchanged) ---
    const resetForm = () => {
        setFiles([]);
        setTitle('');
        setCategory(allowedCategories[0]?.value || 'other');
        setHasInteracted(false); // NEW: Reset interaction state
    };

    // --- (Unchanged) handleSubmit Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0 || !category) {
            return toast.error("Please provide at least one file and a category.");
        }
        if (!api || !professionalProfile?.publicKey || !patientProfile?.publicKey) {
            return toast.error("User profiles not fully loaded. Cannot encrypt.");
        }

        setIsUploading(true);
        const overallToastId = toast.loading(`Starting batch upload for ${files.length} file(s)...`);

        const records = [];

        for (const [index, file] of files.entries()) {
            const fileToastId = toast.loading(`[${index + 1}/${files.length}] Processing ${file.name}...`);

            try {
                const fileBuffer = await file.arrayBuffer();
                const recipientPublicKeys = [patientProfile.publicKey, professionalProfile.publicKey];
                const encryptedBundle = await hybridEncrypt(fileBuffer, recipientPublicKeys);

                toast.loading(`[${index + 1}/${files.length}] Uploading encrypted file for ${file.name}...`, { id: fileToastId });
                const encryptedBundleBlob = new Blob([JSON.stringify(encryptedBundle)], { type: 'application/json' });
                const formData = new FormData();
                formData.append("file", encryptedBundleBlob, `encrypted-${Date.now()}.json`);
                const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload encrypted file');
                const bundleHash = uploadData.ipfsHash;

                const fileTitle = title.trim() ? `${title.trim()} - ${file.name}` : file.name;

                const metadata = {
                    title: fileTitle,
                    category,
                    fileType: file.type || 'application/octet-stream',
                    fileName: file.name,
                    encryptedBundleIPFSHash: bundleHash
                };

                toast.loading(`[${index + 1}/${files.length}] Uploading metadata for ${file.name}...`, { id: fileToastId });
                const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
                const metadataFormData = new FormData();
                metadataFormData.append("file", metadataBlob, `metadata-${Date.now()}.json`);
                const metadataUploadResponse = await fetch('/api/upload', { method: 'POST', body: metadataFormData });
                const metadataUploadData = await metadataUploadResponse.json();
                if (!metadataUploadResponse.ok) throw new Error(metadataUploadData.error || 'Failed to upload metadata');
                const metadataHash = metadataUploadData.ipfsHash;

                const patientKeyBundle = encryptedBundle.encryptedSymmetricKeys[patientProfile.publicKey];
                const professionalKeyBundle = encryptedBundle.encryptedSymmetricKeys[professionalProfile.publicKey];
                if (!patientKeyBundle || !professionalKeyBundle) {
                    throw new Error("Encryption key bundling failed.");
                }

                records.push({
                    ipfsHash: metadataHash,
                    title: fileTitle,
                    category: category,
                    encryptedKeyForPatient: JSON.stringify(patientKeyBundle),
                    encryptedKeyForHospital: JSON.stringify(professionalKeyBundle)
                });

                toast.success(`[${index + 1}/${files.length}] Successfully processed ${file.name}!`, { id: fileToastId });

            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                toast.error(`[${index + 1}/${files.length}] Failed to process ${file.name}: ${error.message}`, { id: fileToastId });
            }
        }

        if (records.length > 0) {
            try {
                toast.loading(`Adding ${records.length} verified record(s) to blockchain...`, { id: overallToastId });

                await api.addVerifiedRecordsBatch({
                    patient: patientProfile.walletAddress,
                    records: records
                });

                toast.success(`Successfully added ${records.length} verified record(s)!`, { id: overallToastId });
                resetForm(); // Use resetForm function
                if (onUploadSuccess) onUploadSuccess();

            } catch (error) {
                console.error("Batch submit failed:", error);
                toast.error(`Batch submission failed: ${error.message || "An error occurred."}`, { id: overallToastId });
            }
        } else {
            toast.error("No files were processed successfully.", { id: overallToastId });
        }

        setIsUploading(false);
    };

    // --- (From Plan) REFACTORED JSX ---
    return (
        <motion.div
            variants={formContainerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
        >
            {/* --- LEFT COLUMN: CONTROLS --- */}
            <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">Batch Title (Optional)</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Patient X-Rays"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">This title will be pre-pended to each filename (e.g., "X-Rays - scan.pdf").</p>
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">Category (for all files)</label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition"
                    >
                        {allowedCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                <div className="p-4 text-sm text-blue-800 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3" role="alert">
                    <div className="flex-shrink-0 pt-0.5">
                        <ShieldCheck className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                        <span className="font-semibold">Verified Record:</span> Files are encrypted for *both* you and the patient, and marked as "Verified" in their record.
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isUploading || files.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:scale-100 transition-all duration-200"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing Batch...
                        </>
                    ) : (
                        `Encrypt & Upload ${files.length} Record(s)`
                    )}
                </button>
            </motion.form>

            {/* --- RIGHT COLUMN: SECURE VAULT --- */}
            <motion.div variants={itemVariants} className="relative max-w-md mx-auto w-full">
                <div className="relative bg-slate-900 rounded-lg shadow-2xl p-6 space-y-4 h-full flex flex-col min-h-[400px]">
                    <div className="flex items-center gap-3 text-white border-b border-slate-700 pb-4 mb-2">
                        <ShieldCheck className="h-6 w-6 text-blue-400" />
                        <h3 className="text-lg font-semibold">Verified Upload Vault</h3>
                    </div>

                    <AnimatePresence mode="wait">
                        {isUploading ? (
                            <EncryptionAnimation key="encrypting" fileCount={files.length} />
                        ) : (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 flex flex-col justify-between space-y-4"
                            >
                                {files.length === 0 && !hasInteracted && (
                                    <VerifiedVaultDropzone
                                        onDrop={handleDrop}
                                        onDragOver={handleDrag}
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        onChange={handleChange}
                                        isDragActive={isDragActive}
                                    />
                                )}

                                {files.length > 0 && (
                                    <div key="files-list" className="flex-1 flex flex-col justify-between space-y-4 min-h-[200px]">
                                        <ul className="space-y-2 flex-1 overflow-y-auto max-h-[250px] pr-1">
                                            <AnimatePresence>
                                                {files.map((file, index) => (
                                                    <motion.li
                                                        key={`${file.name}-${index}`}
                                                        layout
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
                                                        className="list-none flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <FileIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                                                            <span className="text-sm font-medium text-slate-200 truncate" title={file.name}>{file.name}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(index)}
                                                            className="p-1 text-slate-500 rounded-full hover:bg-slate-700 hover:text-red-500 transition-colors flex-shrink-0"
                                                        >
                                                            <CloseIcon className="w-4 h-4" />
                                                        </button>
                                                    </motion.li>
                                                ))}
                                            </AnimatePresence>
                                        </ul>
                                        <AddMoreDropzone
                                            onDrop={handleDrop}
                                            onDragOver={handleDrag}
                                            onDragEnter={handleDragEnter}
                                            onDragLeave={handleDragLeave}
                                            onChange={handleChange}
                                            isDragActive={isDragActive}
                                        />
                                    </div>
                                )}

                                {files.length === 0 && hasInteracted && (
                                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col justify-between space-y-4">
                                        <p className="text-slate-400 text-sm text-center py-10 flex-1">
                                            Vault is empty. Add files to secure them.
                                        </p>
                                        <AddMoreDropzone
                                            onDrop={handleDrop}
                                            onDragOver={handleDrag}
                                            onDragEnter={handleDragEnter}
                                            onDragLeave={handleDragLeave}
                                            onChange={handleChange}
                                            isDragActive={isDragActive}
                                        />
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}

