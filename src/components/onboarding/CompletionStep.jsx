import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Kanban, Package, LayoutDashboard, ArrowRight, CheckCircle2 } from 'lucide-react';


export default function CompletionStep({ job, orgName }) {
  const jobId = job?.id;

  const cards = [
    {
      icon: Kanban,
      title: 'View your job',
      description: 'Open the job you just created and start adding details.',
      to: jobId ? `/jobs/${jobId}` : '/jobs',
    },
    {
      icon: Package,
      title: 'Add materials to your estimate',
      description: 'Build out your material list and labor hours.',
      to: jobId ? `/jobs/${jobId}` : '/jobs',
    },
    {
      icon: LayoutDashboard,
      title: 'Explore the dashboard',
      description: 'See your shop overview, metrics, and activity.',
      to: '/',
    },
  ];

  return (
    <div className="text-center space-y-6 py-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Your shop is set up.</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Here's where to go next:
        </p>
      </div>

      <div className="grid gap-3 text-left">
        {cards.map((card) => (
          <Link key={card.title} to={card.to}>
            <Card className="hover:border-primary hover:shadow-sm transition-all cursor-pointer group">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <card.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}