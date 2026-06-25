import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function BillingHistoryTable({ billing, isLoading }) {
  const invoices = billing?.invoices || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Billing History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No billing history yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Once you subscribe to a plan, your invoices will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Description</th>
                  <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  return (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                        {inv.period_end
                          ? format(new Date(inv.period_end), 'MMM d, yyyy')
                          : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {inv.number || 'Subscription'}
                          </span>
                          {inv.hosted_url && (
                            <a
                              href={inv.hosted_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        ${(inv.amount_paid || 0).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={isPaid ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending
                            </>
                          )}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}