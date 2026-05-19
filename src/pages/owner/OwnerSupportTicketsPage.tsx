import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownerApi } from '@/api/owner';
import { format } from 'date-fns';
import { X, Plus } from 'lucide-react';

export function OwnerSupportTicketsPage() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketContent, setNewTicketContent] = useState('');
  
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['owner-tickets'],
    queryFn: ownerApi.getTickets,
  });

  const { data: ticketDetails } = useQuery({
    queryKey: ['owner-ticket', selectedTicketId],
    queryFn: () => ownerApi.getTicketDetails(selectedTicketId!),
    enabled: !!selectedTicketId,
  });

  const createMutation = useMutation({
    mutationFn: () => ownerApi.createTicket({ title: newTicketTitle, content: newTicketContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-tickets'] });
      setShowCreate(false);
      setNewTicketTitle('');
      setNewTicketContent('');
    },
  });

  const replyMutation = useMutation({
    mutationFn: () => ownerApi.replyTicket(selectedTicketId!, replyContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['owner-tickets'] });
      setReplyContent('');
    },
  });

  if (isLoading) return <div className="p-6">Loading tickets...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Desk</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors"
        >
          <Plus className="h-4 w-4" /> New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-medium">My Tickets</div>
          <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
            {tickets.map((t: any) => (
              <button
                key={t._id}
                onClick={() => setSelectedTicketId(t._id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedTicketId === t._id ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900 truncate pr-2">{t.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${t.status === 'Open' ? 'bg-amber-100 text-amber-800' : t.status === 'Closed' ? 'bg-gray-100 text-gray-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {t.status}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{format(new Date(t.updatedAt), 'MMM d, yyyy HH:mm')}</div>
              </button>
            ))}
            {tickets.length === 0 && <div className="p-4 text-gray-500 text-center">No support tickets found.</div>}
          </div>
        </div>

        <div className="lg:col-span-2 border border-gray-200 rounded-lg bg-white flex flex-col min-h-[500px]">
          {!selectedTicketId || !ticketDetails ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a ticket to view conversation or create a new one.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 flex justify-between items-start bg-gray-50">
                <div>
                  <h2 className="text-lg font-bold">{ticketDetails.ticket.title}</h2>
                  <p className="text-sm text-gray-600">Status: <span className="font-medium">{ticketDetails.ticket.status}</span></p>
                </div>
                <button onClick={() => setSelectedTicketId(null)} className="p-1 hover:bg-gray-200 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {ticketDetails.messages.map((m: any) => (
                  <div key={m._id} className={`flex flex-col ${m.senderType === 'Owner' ? 'items-end' : 'items-start'}`}>
                    <div className="text-xs text-gray-500 mb-1">{m.senderType === 'Owner' ? 'You' : 'Super Admin'}</div>
                    <div className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${m.senderType === 'Owner' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {m.content}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">{format(new Date(m.createdAt), 'HH:mm - MMM d')}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary focus:border-primary"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => replyMutation.mutate()}
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50"
                  >
                    {replyMutation.isPending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4">Create Support Ticket</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Cannot access specific outlet data"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Describe your issue</label>
                <textarea
                  value={newTicketContent}
                  onChange={(e) => setNewTicketContent(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                  rows={5}
                  placeholder="Please provide details about the problem..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newTicketTitle.trim() || !newTicketContent.trim() || createMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
