import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EnterpriseInquiryModal({ open, onOpenChange }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    shopSize: '',
    needs: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.shopSize || !form.needs) {
      toast.error('Please fill in all fields');
      return;
    }
    // Build a mailto with the inquiry details
    const subject = 'Enterprise Plan Inquiry';
    const body = `Name: ${form.name}%0D%0A%0D%0AShop Size: ${form.shopSize}%0D%0A%0D%0AWhat I need:%0D%0A${form.needs}`;
    window.location.href = `mailto:support@fabtrack.app?subject=${encodeURIComponent(subject)}&body=${body}`;
    setSubmitted(true);
  };

  const handleClose = (open) => {
    onOpenChange(open);
    if (!open) {
      // Reset after animation
      setTimeout(() => {
        setSubmitted(false);
        setForm({ name: '', shopSize: '', needs: '' });
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Enterprise Inquiry
          </DialogTitle>
          <DialogDescription>
            Tell us about your shop and we'll get back to you with a custom plan.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium">Inquiry sent!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your email app should have opened. If not, email us directly at support@fabtrack.app.
              </p>
            </div>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inq-name">Your name</Label>
              <Input
                id="inq-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inq-size">Shop size</Label>
              <Select
                value={form.shopSize}
                onValueChange={(v) => setForm({ ...form, shopSize: v })}
              >
                <SelectTrigger id="inq-size">
                  <SelectValue placeholder="Select your team size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1–5 employees</SelectItem>
                  <SelectItem value="6-15">6–15 employees</SelectItem>
                  <SelectItem value="16-30">16–30 employees</SelectItem>
                  <SelectItem value="31-50">31–50 employees</SelectItem>
                  <SelectItem value="50+">50+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inq-needs">What do you need?</Label>
              <Textarea
                id="inq-needs"
                value={form.needs}
                onChange={(e) => setForm({ ...form, needs: e.target.value })}
                placeholder="Multi-location support, API access, custom branding, dedicated onboarding, etc."
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Send className="w-4 h-4" />
                Send Inquiry
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}