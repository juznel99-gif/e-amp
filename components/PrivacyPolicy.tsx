
import React from 'react';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ isOpen, onClose }) => {
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
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Privacy Policy</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close privacy policy"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-6 text-lg leading-relaxed">
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <p>
            Welcome to One-Punch Amp. We are committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our sound amplifier application.
          </p>

          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">1. No Data Collection</h3>
            <p>
              This application operates entirely within your browser. We do <strong>not</strong> collect, transmit, or store any personal data, audio data, or usage analytics on any external servers. Your privacy is paramount.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">2. Audio Processing</h3>
            <p>
              The core function of this application is to process audio from your microphone in real-time. All audio processing happens locally on your device. The audio data from your microphone is used solely for the purpose of amplification and visualization and is <strong>never</strong> sent over the internet.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">3. Local Recordings</h3>
            <p>
              If you choose to use the recording feature, the audio recordings are stored locally on your own device using your browser's IndexedDB storage. These recordings are not accessible to us or any third party. You have full control over your recordings and can delete them at any time from within the application.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">4. Permissions</h3>
            <p>
              The application will request permission to access your microphone. This permission is necessary for the amplifier to function. We do not access your microphone for any other purpose.
            </p>
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">5. Changes to This Privacy Policy</h3>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page. We encourage you to review this Privacy Policy periodically.
            </p>
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-yellow-400 mb-2">6. Contact Us</h3>
            <p>
              If you have any questions about this Privacy Policy, please note that this is a demonstration application and does not have a formal contact method.
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

export default PrivacyPolicy;
