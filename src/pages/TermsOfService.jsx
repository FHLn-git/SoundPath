import { FileText } from 'lucide-react'

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl font-bold">Terms of Service</h1>
        </div>

        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 space-y-6">
          <p className="text-gray-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing and using SoundPath ("the Service"), you accept and agree to be bound by
              the terms and provision of this agreement. If you do not agree to abide by the above,
              please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Permission is granted to temporarily use SoundPath for personal or commercial use.
              This is the grant of a license, not a transfer of title, and under this license you
              may not:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose without explicit permission</li>
              <li>Attempt to reverse engineer any software contained in SoundPath</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <p className="text-gray-300 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password.
              You agree to accept responsibility for all activities that occur under your account.
              You must notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Subscription and Billing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              SoundPath offers various subscription plans. By subscribing, you agree to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Pay all fees associated with your subscription</li>
              <li>Automatic renewal of your subscription unless cancelled</li>
              <li>No refunds for partial subscription periods</li>
              <li>Price changes will be communicated 30 days in advance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Content and Data</h2>
            <p className="text-gray-300 leading-relaxed">
              You retain all rights to your content. By using SoundPath, you grant us a license to
              store, process, and display your content solely for the purpose of providing the
              Service. You are responsible for ensuring you have the rights to any content you
              upload.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Prohibited Uses</h2>
            <p className="text-gray-300 leading-relaxed mb-4">You may not use SoundPath:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>In any way that violates any applicable law or regulation</li>
              <li>To transmit any malicious code or viruses</li>
              <li>To spam, harass, or harm other users</li>
              <li>To interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Termination</h2>
            <p className="text-gray-300 leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice, for
              conduct that we believe violates these Terms of Service or is harmful to other users,
              us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Disclaimer</h2>
            <p className="text-gray-300 leading-relaxed">
              The materials on SoundPath are provided on an 'as is' basis. We make no warranties,
              expressed or implied, and hereby disclaim and negate all other warranties including,
              without limitation, implied warranties or conditions of merchantability, fitness for a
              particular purpose, or non-infringement of intellectual property or other violation of
              rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              In no event shall SoundPath or its suppliers be liable for any damages (including,
              without limitation, damages for loss of data or profit, or due to business
              interruption) arising out of the use or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any
              material changes via email or through the Service. Your continued use of the Service
              after such modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Contact Information</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:support@soundpath.app" className="text-blue-400 hover:underline">
                support@soundpath.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService
