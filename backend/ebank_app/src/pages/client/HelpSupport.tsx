import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import ContactSupportModal from '../../components/modals/ContactSupportModal';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Search,
  ChevronRight,
  HelpCircle,
  Shield,
  CreditCard,
  RefreshCw,
  FileText,
  Users,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';

interface SupportTicket {
  id: string;
  ticketId: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
  status: 'new' | 'in-progress' | 'resolved' | 'closed';
  timestamp: string;
  responseCount?: number;
  lastResponseAt?: string;
}

interface TicketResponse {
  id: string;
  message: string;
  respondedBy: string;
  respondedAt: string;
  isAdminResponse: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  order: number;
}

const HelpSupport: React.FC = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedContactMethod, setSelectedContactMethod] = useState<string>('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const { user } = useAuth();
  const { getContactEmail, getContactPhone } = useSystemConfigContext();
  const supportEmail = getContactEmail();
  const supportPhone = getContactPhone();
  const supportPhoneHref = `tel:${supportPhone.replace(/[^+\d]/g, '')}`;
  const supportEmailHref = `mailto:${supportEmail}`;
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<SupportTicket | null>(null);
  const [ticketResponses, setTicketResponses] = useState<TicketResponse[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);

  // Load responses for selected ticket
  useEffect(() => {
    if (!selectedTicketDetail?.id) {
      setTicketResponses([]);
      return;
    }

    setResponsesLoading(true);
    const q = query(
      collection(db, 'support_requests', selectedTicketDetail.id, 'responses'),
      orderBy('respondedAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const responses: TicketResponse[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TicketResponse));
      setTicketResponses(responses);
      setResponsesLoading(false);
    }, () => {
      setResponsesLoading(false);
    });

    return () => unsubscribe();
  }, [selectedTicketDetail?.id]);

  // Load FAQs from Firestore
    // Load user's support tickets
    useEffect(() => {
      if (!user?.uid) {
        setTicketsLoading(false);
        return;
      }
      const q = query(
        collection(db, 'support_requests'),
        where('user.uid', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tickets: SupportTicket[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SupportTicket));
        setMyTickets(tickets);
        setTicketsLoading(false);
      }, () => {
        setTicketsLoading(false);
      });
      return () => unsubscribe();
    }, [user?.uid]);

    const getContactModalProps = useCallback((method: string) => {
      switch (method) {
        case 'phone':
          return { defaultSubject: 'Callback Request', initialContactMethod: 'phone', defaultCategory: 'general' };
        case 'email':
          return { defaultSubject: 'Email Support Request', initialContactMethod: 'email', defaultCategory: 'general' };
        case 'urgent':
          return { defaultSubject: 'Urgent Issue', defaultPriority: 'critical', defaultCategory: 'general' };
        case 'general':
          return { defaultCategory: 'general' as const };
        case 'chat':
        default:
          return { defaultSubject: 'Live Chat Support Request', initialContactMethod: 'email' };
      }
    }, []);

    const getTicketStatusColor = (status: string) => {
      switch (status) {
        case 'new': return 'bg-blue-100 text-blue-800';
        case 'in-progress': return 'bg-yellow-100 text-yellow-800';
        case 'resolved': return 'bg-green-100 text-green-800';
        case 'closed': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getTicketStatusLabel = (status: string) => {
      switch (status) {
        case 'new': return 'New';
        case 'in-progress': return 'In Progress';
        case 'resolved': return 'Resolved';
        case 'closed': return 'Closed';
        default: return status;
      }
    };
  useEffect(() => {
    const q = query(
      collection(db, 'faqs'),
      where('isActive', '==', true),
      orderBy('order', 'asc'),
      orderBy('question', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const faqsData: FAQ[] = [];
      snapshot.forEach((doc) => {
        faqsData.push({
          id: doc.id,
          ...doc.data()
        } as FAQ);
      });
      setFaqs(faqsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching FAQs:', error);
      // Fallback: use empty array if collection doesn't exist
      setFaqs([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = [
    { id: 'all', name: 'All Topics', icon: HelpCircle },
    { id: 'account', name: 'Account Management', icon: Users },
    { id: 'transfers', name: 'Transfers & Payments', icon: RefreshCw },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'fees', name: 'Fees & Charges', icon: CreditCard },
    { id: 'mobile', name: 'Mobile Banking', icon: Phone },
    { id: 'deposits', name: 'Deposits & Withdrawals', icon: FileText },
    { id: 'support', name: 'Customer Service', icon: MessageCircle }
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    const validCategories = new Set(categories.map((category) => category.id));
    if (categoryParam && validCategories.has(categoryParam)) {
      setSelectedCategory(categoryParam);
    }
  }, [location.search]);

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });



  return (
    <DashboardLayout 
      title="Help & Support" 
      subtitle="Get help and find answers to your questions"
    >
      <div className="space-y-6">
        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600 mb-4">Start a live chat request ticket for immediate support follow-up</p>
            <Button 
              className="w-full"
              onClick={() => {
                setSelectedContactMethod('chat');
                setContactModalOpen(true);
              }}
            >
              Start Chat
            </Button>
            <p className="text-xs text-gray-500 mt-2">Available 24/7 via support queue</p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-sm text-gray-600 mb-4">Speak directly with a support representative</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setSelectedContactMethod('phone');
                setContactModalOpen(true);
              }}
            >
              Request Call Back
            </Button>
            <a href={supportPhoneHref} className="text-xs text-green-700 hover:text-green-800 underline mt-2 inline-block">
              {supportPhone}
            </a>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-sm text-gray-600 mb-4">Send us a detailed message</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open(supportEmailHref, '_blank')}
            >
              Send Email
            </Button>
            <p className="text-xs text-gray-500 mt-2">Response in 24 hours • {supportEmail}</p>
          </Card>
        </div>

        {/* Search and FAQ */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search for help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <category.icon className="w-4 h-4 mr-2" />
                {category.name}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading FAQs...</p>
              </div>
            ) : filteredFAQs.length === 0 ? (
              <div className="text-center py-8">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {faqs.length === 0 
                    ? "No FAQs available. Please contact support for assistance." 
                    : "No FAQs found matching your search"}
                </p>
                {searchQuery && (
                  <p className="text-sm text-gray-400 mt-2">
                    Try adjusting your search terms or browse different categories
                  </p>
                )}
              </div>
            ) : (
              filteredFAQs.map((faq) => (
                <details key={faq.id} className="group border border-gray-200 rounded-lg">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))
            )}
          </div>
        </Card>

        {/* Contact Support Section */}
        <Card className="p-6 text-center bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Still Need Help?</h3>
            <p className="text-gray-600 mb-6">
              Can't find what you're looking for? Our support team is here to help you with any questions or concerns.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => {
                  setSelectedContactMethod('general');
                  setContactModalOpen(true);
                }}
                className="px-8 py-3"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedContactMethod('urgent');
                  setContactModalOpen(true);
                }}
                className="px-8 py-3"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Urgent Issue
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Average response time: 2 hours for urgent issues, 24 hours for general inquiries
            </p>
          </div>
        </Card>

        {/* Additional Resources */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'User Guide',
                description: 'Complete guide to using our banking platform',
                icon: FileText,
                link: '/help'
              },
              {
                title: 'Security Center',
                description: 'Learn about keeping your account secure',
                icon: Shield,
                link: '/profile'
              },
              {
                title: 'Mobile App Guide',
                description: 'How to use our mobile banking app',
                icon: Phone,
                link: '/help?category=mobile'
              },
              {
                title: 'Fee Schedule',
                description: 'Complete list of fees and charges',
                icon: CreditCard,
                link: '/statements'
              },
              {
                title: 'Service Status',
                description: 'Check current system status and outages',
                icon: CheckCircle,
                link: '/help?category=support'
              },
              {
                title: 'Video Tutorials',
                description: 'Step-by-step video guides',
                icon: Users,
                link: '/help?category=all'
              },
            ].map((resource) => (
              <Link
                key={resource.title}
                to={resource.link}
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center mb-3">
                  <resource.icon className="h-5 w-5 text-blue-600 mr-3" />
                  <h4 className="font-medium text-gray-900">{resource.title}</h4>
                </div>
                <p className="text-sm text-gray-600">{resource.description}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Contact Support Modal */}
      {contactModalOpen && (
        <ContactSupportModal
          isOpen={contactModalOpen}
          onClose={() => {
            setContactModalOpen(false);
            setSelectedContactMethod('');
          }}
          {...getContactModalProps(selectedContactMethod)}
        />
      )}
            {/* My Support Tickets */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">My Support Tickets</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedContactMethod('general');
                    setContactModalOpen(true);
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  New Ticket
                </Button>
              </div>

              {ticketsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500 text-sm">Loading your tickets...</p>
                </div>
              ) : myTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No support tickets yet.</p>
                  <p className="text-xs mt-1 text-gray-400">Submit a request above and it will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <p className="text-xs text-gray-500 mb-3">Click any ticket row to view full details and responses.</p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Ticket #</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Responses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {myTickets.map((ticket) => (
                        <tr 
                          key={ticket.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedTicketDetail(ticket)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedTicketDetail(ticket);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          title="Open ticket details"
                        >
                          <td className="py-3 px-4 font-mono text-blue-600">#{ticket.ticketId}</td>
                          <td className="py-3 px-4 text-gray-900 max-w-xs truncate">{ticket.subject}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTicketStatusColor(ticket.status)}`}>
                              {getTicketStatusLabel(ticket.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                            {new Date(ticket.timestamp).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {ticket.responseCount && ticket.responseCount > 0 ? (
                              <span className="text-green-600 font-medium">{ticket.responseCount} response{ticket.responseCount > 1 ? 's' : ''}</span>
                            ) : (
                              <span className="text-gray-400">Awaiting reply</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            {/* Ticket Details Modal */}
            {selectedTicketDetail && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Ticket #{selectedTicketDetail.ticketId}</h2>
                      <p className="text-sm text-gray-500 mt-1">{selectedTicketDetail.subject}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTicketDetail(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Ticket Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTicketStatusColor(selectedTicketDetail.status)}`}>
                            {getTicketStatusLabel(selectedTicketDetail.status)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Created</p>
                        <p className="text-sm text-gray-900 mt-1">{new Date(selectedTicketDetail.timestamp).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Category</p>
                        <p className="text-sm text-gray-900 mt-1 capitalize">{selectedTicketDetail.category}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Priority</p>
                        <p className="text-sm text-gray-900 mt-1 capitalize">{selectedTicketDetail.priority}</p>
                      </div>
                    </div>

                    {/* Original Message */}
                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Your Message</p>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 max-h-40 overflow-y-auto">
                        {selectedTicketDetail.message}
                      </div>
                    </div>

                    {/* Responses */}
                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-3">Responses ({ticketResponses.length})</p>
                      {responsesLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-500">Loading responses...</p>
                        </div>
                      ) : ticketResponses.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">No responses yet.</p>
                          <p className="text-xs text-gray-400 mt-1">Our team is working on your request.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ticketResponses.map((response) => (
                            <div key={response.id} className={`rounded-lg p-4 ${response.isAdminResponse ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <p className={`text-xs font-semibold ${response.isAdminResponse ? 'text-blue-700' : 'text-gray-700'}`}>
                                  {response.isAdminResponse ? 'Support Team' : 'You'} ({response.respondedBy})
                                </p>
                                <p className="text-xs text-gray-500">{new Date(response.respondedAt).toLocaleString()}</p>
                              </div>
                              <p className="text-sm text-gray-700 max-h-32 overflow-y-auto">{response.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="sticky bottom-0 flex gap-3 p-6 border-t bg-gray-50">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTicketDetail(null)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                    {selectedTicketDetail.status !== 'closed' && (
                      <Button
                        onClick={() => {
                          setSelectedTicketDetail(null);
                          setSelectedContactMethod('general');
                          setContactModalOpen(true);
                        }}
                        className="flex-1"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Add Response
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Additional Resources */}
    </DashboardLayout>
  );
};

export default HelpSupport;