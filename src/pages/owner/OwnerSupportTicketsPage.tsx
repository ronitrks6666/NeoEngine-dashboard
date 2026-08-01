import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownerApi } from '@/api/owner';
import { format } from 'date-fns';
import {
  X,
  Plus,
  Headset,
  ChevronRight,
  Clock,
  MessageSquare,
  Inbox,
} from 'lucide-react';

type SupportTicket = {
  _id: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  updatedAt: string;
  createdAt?: string;
};

function ticketStatusStyle(status: string) {
  switch (status) {
    case 'Open':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'In Progress':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'Resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'Closed':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function ticketPriorityStyle(priority?: string) {
  switch (priority) {
    case 'Critical':
      return 'bg-red-50 text-red-700';
    case 'High':
      return 'bg-orange-50 text-orange-700';
    case 'Low':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function SupportTicketsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
      <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="h-5 w-28 bg-gray-200 rounded-lg" />
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-3">
              <div className="flex justify-between gap-3">
                <div className="h-4 flex-1 bg-gray-200 rounded" />
                <div className="h-5 w-14 bg-gray-200 rounded-full" />
              </div>
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[500px] flex flex-col">
        <div className="p-5 border-b border-gray-100 space-y-2">
          <div className="h-6 w-2/3 bg-gray-200 rounded-lg" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
        <div className="flex-1 p-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`h-16 rounded-2xl bg-gray-100 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  const typedTickets = tickets as SupportTicket[];

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Desk</h1>
          <p className="text-gray-500 mt-0.5">Raise tickets and chat with our support team</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={isLoading}
          className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors font-semibold text-sm shadow-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> New Ticket
        </button>
      </div>

      {isLoading ? (
        <SupportTicketsSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[75vh]">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Headset className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">My Tickets</p>
                  <p className="text-[11px] text-gray-500">Your support requests</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                {typedTickets.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {typedTickets.map((t) => {
                const isSelected = selectedTicketId === t._id;
                return (
                  <button
                    key={t._id}
                    onClick={() => setSelectedTicketId(t._id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all group ${
                      isSelected
                        ? 'border-emerald-200 bg-emerald-50/70 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-emerald-100 hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 pr-1">
                        {t.title}
                      </p>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 mt-0.5 transition-colors ${
                          isSelected ? 'text-emerald-600' : 'text-gray-300 group-hover:text-gray-400'
                        }`}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${ticketStatusStyle(t.status)}`}>
                        {t.status}
                      </span>
                      {t.priority && (
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${ticketPriorityStyle(t.priority)}`}>
                          {t.priority}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                      <Clock className="h-3 w-3" />
                      Updated {format(new Date(t.updatedAt), 'MMM d, yyyy · hh:mm a')}
                    </div>
                  </button>
                );
              })}

              {typedTickets.length === 0 && (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                    <Inbox className="h-7 w-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No tickets yet</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                    Create a ticket and our team will get back to you.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[500px]">
            {!selectedTicketId || !ticketDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-emerald-500/70" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Select a ticket</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Choose a ticket from the list to view the conversation, or create a new one.
                </p>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 rounded-t-2xl">
                  <div className="min-w-0 pr-4">
                    <h2 className="text-lg font-bold text-gray-900">{ticketDetails.ticket.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${ticketStatusStyle(ticketDetails.ticket.status)}`}>
                        {ticketDetails.ticket.status}
                      </span>
                      {ticketDetails.ticket.priority && (
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${ticketPriorityStyle(ticketDetails.ticket.priority)}`}>
                          {ticketDetails.ticket.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="p-2 rounded-lg hover:bg-gray-200/70 text-gray-500 transition-colors"
                    aria-label="Close ticket"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {ticketDetails.messages.map((m: { _id: string; senderType: string; content: string; createdAt: string }) => (
                    <div key={m._id} className={`flex flex-col ${m.senderType === 'Owner' ? 'items-end' : 'items-start'}`}>
                      <div className="text-xs text-gray-500 mb-1 font-medium">
                        {m.senderType === 'Owner' ? 'You' : 'Super Admin'}
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed ${
                          m.senderType === 'Owner'
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        {m.content}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1.5 font-medium">
                        {format(new Date(m.createdAt), 'MMM d, yyyy · hh:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-5 border-t border-gray-100">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full border border-gray-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                    rows={3}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => replyMutation.mutate()}
                      disabled={!replyContent.trim() || replyMutation.isPending}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-semibold transition-colors"
                    >
                      {replyMutation.isPending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg relative animate-slide-up shadow-xl">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-1 text-gray-900">Create Support Ticket</h2>
            <p className="text-sm text-gray-500 mb-5">Describe your issue and we&apos;ll respond as soon as possible.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g., Cannot access specific outlet data"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Describe your issue</label>
                <textarea
                  value={newTicketContent}
                  onChange={(e) => setNewTicketContent(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  rows={5}
                  placeholder="Please provide details about the problem..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newTicketTitle.trim() || !newTicketContent.trim() || createMutation.isPending}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-semibold"
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
