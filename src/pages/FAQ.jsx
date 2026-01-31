import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: 'What is SoundPath?',
      answer:
        'SoundPath is an A&R (Artist & Repertoire) demo tracking platform designed for record labels and music industry professionals. It helps you manage the entire demo submission pipeline from initial inbox to release.',
    },
    {
      question: 'How do I submit a demo?',
      answer:
        'You can submit demos through public submission forms. Each organization has a unique submission link that you can share with artists. The link format is: your-domain.com/submit/label/organization-slug',
    },
    {
      question: 'What are the different phases in the pipeline?',
      answer:
        'The pipeline consists of several phases: Inbox (new submissions), Second Listen (review stage), The Office (serious consideration), Contracting (negotiation), Upcoming (scheduled releases), and The Vault (released tracks).',
    },
    {
      question: 'How does voting work?',
      answer:
        'In the Second Listen phase, team members can vote on tracks using +1/-1 buttons. Each staff member gets one vote per track. Only Owners and Managers can advance tracks beyond Second Listen.',
    },
    {
      question: 'Can I belong to multiple organizations?',
      answer:
        'Yes! SoundPath supports universal profiles, meaning you can be a member of multiple organizations. Switch between organizations using the Launchpad view.',
    },
    {
      question: 'How do I invite team members?',
      answer:
        'Organization Owners can invite team members from the Staff Management page. Enter their email address and assign a role (Owner, Manager, or Scout). They will receive an email invitation.',
    },
    {
      question: 'What are the subscription plans?',
      answer:
        'SoundPath offers Free, Starter, Pro, and Enterprise plans. Each plan has different limits on tracks, staff members, and features. Check the Billing page for details on your current plan.',
    },
    {
      question: 'How do I upgrade my plan?',
      answer:
        'Organization Owners can upgrade plans from the Billing page. Select your desired plan and complete the checkout process. Your subscription will be updated immediately.',
    },
    {
      question: 'What happens if I reach my usage limits?',
      answer:
        'You will see warnings when approaching your limits. Once you reach a limit, you may need to upgrade your plan or remove some content to continue adding new items.',
    },
    {
      question: 'Can I export my data?',
      answer:
        'Yes! You can export all your personal data from the Data Export page in your account settings. This includes your profile, tracks, votes, and memberships.',
    },
    {
      question: 'How do I delete my account?',
      answer:
        'You can delete your account from the Delete Account page. This action is permanent and cannot be undone. Make sure to export your data first if you want to keep a copy.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Yes. We use industry-standard security measures including encryption in transit and at rest. All data is stored securely on Supabase infrastructure with Row-Level Security (RLS) policies.',
    },
    {
      question: 'Do you offer API access?',
      answer:
        'Yes! API access is available on Pro and Enterprise plans. You can create and manage API keys from the API Keys page. Check our API documentation for details.',
    },
    {
      question: 'How do I contact support?',
      answer:
        "You can contact us through the Contact page or email support@soundpath.app. We'll get back to you as soon as possible.",
    },
  ]

  const toggleFAQ = index => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-800/50 transition-colors"
              >
                <span className="font-semibold text-lg pr-4">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <p className="text-gray-300">
            Still have questions?{' '}
            <a href="/contact" className="text-blue-400 hover:underline font-semibold">
              Contact our support team
            </a>{' '}
            or check out our{' '}
            <a href="/help" className="text-blue-400 hover:underline font-semibold">
              Help Center
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default FAQ
