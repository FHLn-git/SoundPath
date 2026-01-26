import { Link, useNavigate } from 'react-router-dom'
import { Book, HelpCircle, Mail, FileText, Shield, Download, Trash2, CreditCard, Key, Users, ArrowLeft } from 'lucide-react'

const HelpCenter = () => {
  const navigate = useNavigate()

  const helpCategories = [
    {
      title: 'Getting Started',
      icon: Book,
      items: [
        { title: 'Creating Your Account', description: 'Learn how to sign up and set up your profile', link: '/faq' },
        { title: 'Your First Demo Submission', description: 'Step-by-step guide to submitting demos', link: '/faq' },
        { title: 'Understanding the Pipeline', description: 'Learn about the different phases', link: '/faq' }
      ]
    },
    {
      title: 'Account & Settings',
      icon: Users,
      items: [
        { title: 'Managing Your Profile', description: 'Update your name, bio, and preferences', link: '/admin' },
        { title: 'Organization Settings', description: 'Customize your organization\'s branding', link: '/admin' },
        { title: 'Team Management', description: 'Invite and manage team members', link: '/admin/staff' }
      ]
    },
    {
      title: 'Billing & Subscriptions',
      icon: CreditCard,
      items: [
        { title: 'Understanding Plans', description: 'Compare features and limits', link: '/billing' },
        { title: 'Upgrading Your Plan', description: 'How to upgrade or downgrade', link: '/billing' },
        { title: 'Usage Limits', description: 'Learn about track and staff limits', link: '/billing' }
      ]
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      items: [
        { title: 'Privacy Policy', description: 'How we protect your data', link: '/privacy' },
        { title: 'Data Export', description: 'Download a copy of your data', link: '/data-export' },
        { title: 'Delete Account', description: 'Permanently delete your account', link: '/delete-account' }
      ]
    },
    {
      title: 'API & Integrations',
      icon: Key,
      items: [
        { title: 'API Keys', description: 'Create and manage API keys', link: '/api-keys' },
        { title: 'API Documentation', description: 'Learn how to use our API', link: '/api-keys' },
        { title: 'Webhooks', description: 'Set up webhook integrations', link: '/api-keys' }
      ]
    },
    {
      title: 'Support',
      icon: Mail,
      items: [
        { title: 'Contact Support', description: 'Get help from our team', link: '/contact' },
        { title: 'FAQ', description: 'Frequently asked questions', link: '/faq' },
        { title: 'Report a Bug', description: 'Found an issue? Let us know', link: '/contact' }
      ]
    }
  ]

  const quickLinks = [
    { icon: HelpCircle, title: 'FAQ', description: 'Common questions answered', link: '/faq', color: 'blue' },
    { icon: FileText, title: 'Terms of Service', description: 'Read our terms', link: '/terms', color: 'gray' },
    { icon: Shield, title: 'Privacy Policy', description: 'How we handle your data', link: '/privacy', color: 'green' },
    { icon: Download, title: 'Export Data', description: 'Download your data', link: '/data-export', color: 'blue' }
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-gray-400 text-lg">
            Find answers, guides, and resources to help you get the most out of SoundPath
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {quickLinks.map((link, index) => (
            <Link
              key={index}
              to={link.link}
              className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-gray-700 transition-colors group"
            >
              <div className={`w-12 h-12 rounded-lg bg-${link.color}-500/20 flex items-center justify-center mb-4 group-hover:bg-${link.color}-500/30 transition-colors`}>
                <link.icon className={`w-6 h-6 text-${link.color}-400`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{link.title}</h3>
              <p className="text-sm text-gray-400">{link.description}</p>
            </Link>
          ))}
        </div>

        {/* Help Categories */}
        <div className="space-y-8">
          {helpCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-800 rounded-lg">
                  <category.icon className="w-6 h-6 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold">{category.title}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((item, itemIndex) => (
                  <Link
                    key={itemIndex}
                    to={item.link}
                    className="p-4 bg-gray-800/50 rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-gray-800 transition-colors"
                  >
                    <h3 className="font-semibold mb-2 text-gray-200">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-blue-500/10 border border-blue-500/30 rounded-lg p-8 text-center">
          <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Still Need Help?</h2>
          <p className="text-gray-400 mb-6">
            Our support team is here to help. Get in touch and we'll respond as soon as possible.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Mail className="w-5 h-5" />
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HelpCenter
