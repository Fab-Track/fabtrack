import React from "react";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-sidebar">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-3">
          <Shield className="w-6 h-6 text-sidebar-primary" />
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">Privacy Policy</h1>
            <p className="text-sm text-sidebar-foreground/70">Last updated: July 21, 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 prose prose-slate dark:prose-invert max-w-none">
        <h2>1. Introduction</h2>
        <p>
          FabTrack ("we," "us," or "our") operates a software platform that provides
          operations and project management tools for custom metal fabrication shops.
          This Privacy Policy describes how we collect, use, and protect your
          information when you use our website and services.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li><strong>Account Information:</strong> Name, email address, phone number, and company details when you register or request access.</li>
          <li><strong>Business Data:</strong> Job details, customer information, estimates, invoices, and scheduling data you enter into the platform.</li>
          <li><strong>Employee Information:</strong> Names, contact details, and time-tracking data for your team members.</li>
        </ul>
        <h3>2.2 Automatically Collected Information</h3>
        <ul>
          <li>Device and browser information, IP address, and usage data through cookies and similar technologies.</li>
          <li>OAuth tokens when you connect third-party services (e.g., Google Workspace, Gmail, Google Calendar).</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To provide, maintain, and improve our services.</li>
          <li>To process estimates, invoices, and job management workflows.</li>
          <li>To communicate with you about your account and updates.</li>
          <li>To track employee hours and generate payroll reports.</li>
          <li>To comply with legal obligations.</li>
        </ul>

        <h2>4. Data Sharing and Disclosure</h2>
        <p>
          We do not sell your personal information. We may share data with:
        </p>
        <ul>
          <li><strong>Service Providers:</strong> Hosting, payment processing (Stripe), and communication tools (Twilio, Google APIs).</li>
          <li><strong>Legal Authorities:</strong> When required by law or to protect our rights.</li>
          <li><strong>Business Transfers:</strong> In connection with a merger or acquisition.</li>
        </ul>

        <h2>5. OAuth and Third-Party Integrations</h2>
        <p>
          When you connect third-party services such as Google Workspace (Gmail,
          Google Calendar), we use OAuth 2.0 to request limited access to your
          account. We only request the scopes necessary for the integration and
          store tokens securely on our servers. You may revoke access at any time
          through your Google Account settings.
        </p>

        <h2>6. Data Security</h2>
        <p>
          We implement industry-standard security measures including encryption in
          transit (TLS), role-based access controls, and multi-tenant data isolation.
          However, no method of transmission over the Internet is 100% secure.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to
          provide services. You may request deletion of your data at any time.
        </p>

        <h2>8. Your Rights</h2>
        <ul>
          <li>Access, correct, or delete your personal information.</li>
          <li>Export your data in a portable format.</li>
          <li>Withdraw consent for third-party integrations.</li>
        </ul>

        <h2>9. Cookies</h2>
        <p>
          We use essential cookies to maintain your session and preference cookies to
          improve your experience. You can disable cookies in your browser settings.
        </p>

        <h2>10. Children's Privacy</h2>
        <p>
          Our services are not directed to individuals under 18. We do not knowingly
          collect data from children.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. We will notify you of
          significant changes by posting the updated policy on this page.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at
          support@fabtrack.app.
        </p>
      </div>
    </div>
  );
}