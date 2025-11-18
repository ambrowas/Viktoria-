import React from 'react';
import { XIcon } from '@components/icons/IconDefs';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-base-200 p-6 rounded-lg shadow-2xl w-full max-w-md flex flex-col gap-4 border border-white"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-300 border border-white/20" aria-label="Close modal">
                        <XIcon />
                    </button>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;