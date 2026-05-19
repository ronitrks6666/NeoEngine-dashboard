import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { format } from 'date-fns';
import { X } from 'lucide-react';

export function SupportTicketsPage() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: adminApi.getTickets,
  });

  const { data: ticketDetails } = useQuery({
    queryKey: ['admin-ticket', selectedTicketId],
    queryFn: () => adminApi.getTicketDetails(selectedTicketId!),
    enabled: !!selectedTicketId,
  });

  const replyMutation = useMutation({
    mutationFn: () => adminApi.replyTicket(selectedTicketId!, replyContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setReplyContent('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => adminApi.updateTicketStatus(selectedTicketId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
  });

  if (isLoading) return <div className="p-6">Loading tickets...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Support Tickets</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-medium">All Tickets</div>
          <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
            {tickets.map((t: any) => (
              <button
                key={t._id}
                onClick={() => setSelectedTicketId(t._id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedTicketId === t._id ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900 truncate pr-2">{t.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'Open' ? 'bg-amber-100 text-amber-800' : t.status === 'Closed' ? 'bg-gray-100 text-gray-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {t.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500">{t.ownerId?.name}</div>
                <div className="text-xs text-gray-400 mt-1">{format(new Date(t.updatedAt), 'MMM d, yyyy HH:mm')}</div>
              </button>
            ))}
            {tickets.length === 0 && <div className="p-4 text-gray-500 text-center">No tickets found.</div>}
          </div>
        </div>

        <div className="lg:col-span-2 border border-gray-200 rounded-lg bg-white flex flex-col min-h-[500px]">
          {!selectedTicketId || !ticketDetails ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a ticket to view details
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 flex justify-between items-start bg-gray-50">
                <div>
                  <h2 className="text-lg font-bold">{ticketDetails.ticket.title}</h2>
                  <p className="text-sm text-gray-600">From: {ticketDetails.ticket.ownerId?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={ticketDetails.ticket.status}
                    onChange={(e) => statusMutation.mutate(e.target.value)}
                    disabled={statusMutation.isPending}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <button onClick={() => setSelectedTicketId(null)} className="p-1 hover:bg-gray-200 rounded"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {ticketDetails.messages.map((m: any) => (
                  <div key={m._id} className={`flex flex-col ${m.senderType === 'SuperAdmin' ? 'items-end' : 'items-start'}`}>
                    <div className="text-xs text-gray-500 mb-1">{m.senderType === 'SuperAdmin' ? 'You' : ticketDetails.ticket.ownerId?.name}</div>
                    <div className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${m.senderType === 'SuperAdmin' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'}`}>
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
                  placeholder="Type your reply..."
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary focus:border-primary"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => replyMutation.mutate()}
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50"
                  >
                    {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
