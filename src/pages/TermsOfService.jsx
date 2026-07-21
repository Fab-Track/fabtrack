import React from "react";
import { FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-sidebar">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-3">
          <FileText className="w-6 h-6 text-sidebar-primary" />
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">Terms of Service</h1>
            <p className="text-sm text-sidebar-foreground/70">Last updated: July 21, 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 prose prose-slate dark:prose-invert max-w-none">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using FabTrack ("the Service"), you agree to be bound by
          these Terms of Service ("Terms"). If you do not agree, do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          FabTrack provides a cloud-based operations and project management platform
          for custom metal fabrication shops, including estimating, production
          scheduling, shop floor time tracking, job costing, and invoicing tools.
        </p>

        <h2>3. Account Registration</h2>
        <ul>
          <li>You must provide accurate and complete information when registering.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must be at least 18 years old to create an account.</li>
          <li>One organization may not create multiple accounts to circumvent plan limits.</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose.</li>
          <li>Upload malicious code or attempt to disrupt the Service.</li>
          <li>Access another user's data without authorization.</li>
          <li>Resell or sublicense the Service without written consent.</li>
          <li>Use the Service to store or transmit content that infringes intellectual property rights.</li>
        </ul>

        <h2>5. User Data</h2>
        <p>
          You retain all rights to the data you enter into the Service. You are
          responsible for the accuracy and legality of your data, including any
          employee or customer information. We process your data in accordance with
          our Privacy Policy.
        </p>

        <h2>6. Third-Party Integrations</h2>
        <p>
          The Service may integrate with third-party applications including Google
          Workspace (Gmail, Google Calendar), Stripe, and Twilio. These integrations
          are subject to the respective third party's terms and privacy policies.
          We are not responsible for the practices of these third-party services.
        </p>

        <h2>7. Billing and Subscription</h2>
        <ul>
          <li>The Service is offered on a subscription basis with recurring monthly or annual billing.</li>
          <li>Payment is processed through Stripe. You authorize us to charge your payment method for all fees.</li>
          <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
          <li>Refunds are issued at our discretion. Contact support for billing issues.</li>
          <li>Price changes will be communicated at least 30 days in advance.</li>
        </ul>

        <h2>8. Free Trial</h2>
        <p>
          We may offer a free trial period. At the end of the trial, your subscription
          will automatically convert to a paid plan unless you cancel before the trial ends.
        </p>

        <h2>9. Intellectual Property</h2>
        <p>
          The Service, including its software, design, and content, is the property of
          FabTrack and is protected by intellectual property laws. These Terms do not
          grant you any right to use our trademarks or trade names.
        </p>

        <h2>10. Service Availability</h2>
        <p>
          We strive for high availability but do not guarantee uninterrupted service.
          We may modify, suspend, or discontinue the Service at any time without notice.
          We are not liable for any downtime or data loss resulting from service interruptions.
        </p>

        <h2>11. Termination</h2>
        <p>
          You may cancel your account at any time. We may suspend or terminate your
          account if you violate these Terms. Upon termination, your data will be
          retained for 30 days and then permanently deleted, unless required by law.
        </p>

        <h2>12. Disclaimer of Warranties</h2>
        <p>
          The Service is provided "AS IS" and "AS AVAILABLE" without warranties of
          any kind, whether express or implied, including merchantability or fitness
          for a particular purpose.
        </p>

        <h2>13. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, FabTrack shall not be liable for
          any indirect, incidental, or consequential damages, including loss of
          profits, data, or business, arising from your use of the Service.
        </p>

        <h2>14. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Colorado, United States,
          without regard to conflict of law principles.
        </p>

        <h2>15. Changes to These Terms</h2>
        <p>
          We may revise these Terms at any time. The most current version will be
          posted on this page. Continued use of the Service after changes constitutes
          acceptance of the updated Terms.
        </p>

        <h2>16. Contact</h2>
        <p>
          If you have questions about these Terms, please contact us at
          support@fabtrack.app.
        </p>
      </div>
    </div>
  );
}