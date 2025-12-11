
import React from 'react';

interface TermsAndConditionsProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 text-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Terms & Conditions</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close terms and conditions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-6 text-lg leading-relaxed">
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <p>
            Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the One-Punch Amp application (the "Service").
          </p>
          
          <p>
            Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
          </p>

          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">1. Acceptance of Terms</h3>
            <p>
              By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">2. Description of Service</h3>
            <p>
              One-Punch Amp is a tool designed for real-time audio processing and amplification. It operates entirely within your web browser and uses your device's microphone. All processing and storage (if you use the recording feature) are done locally on your device.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">3. User Conduct</h3>
            <p>
              You agree not to use the Service for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the Service in any way that could damage the Service, or the general business of the application provider.
            </p>
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">4. Disclaimer of Warranty</h3>
            <p>
              The Service is provided "as is," without warranty of any kind, express or implied. The developers make no warranty that the Service will meet your requirements or be available on an uninterrupted, secure, or error-free basis. Use of the Service is at your own risk.
            </p>
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">5. Limitation of Liability</h3>
            <p>
              In no event shall the developers of One-Punch Amp be liable for any direct, indirect, incidental, special, or consequential damages, including but not to, damages for hearing loss, data loss, or other intangible losses, resulting from the use or the inability to use the Service. Please be cautious when setting amplification (gain) and volume levels.
            </p>
          </div>

           <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">6. Changes to Terms</h3>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms and Conditions on this page.
            </p>
          </div>

        </div>
        
        <div className="text-right mt-8">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
