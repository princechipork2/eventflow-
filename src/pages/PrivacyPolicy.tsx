import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/constants";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="w-full max-w-4xl mx-auto px-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <div className="glass rounded-2xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="size-6 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Privacy Policy
              </h1>

              <p className="text-sm text-muted-foreground mt-1">
                Last updated: August 23, 2026
              </p>
            </div>
          </div>

          <div className="space-y-8 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                1. Introduction
              </h2>

              <p>
                {APP_NAME} ("EventFlow", "we", "us", or "our") is an
                event discovery and ticketing platform that allows users
                to discover events, create events, manage event
                information, and access event tickets.
              </p>

              <p className="mt-3">
                This Privacy Policy explains what information we collect,
                how we use it, how we protect it, and the choices available
                to you when you use EventFlow.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                2. Information We Collect
              </h2>

              <p>Depending on how you use EventFlow, we may collect:</p>

              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  Account information such as your name and email address.
                </li>
                <li>
                  Authentication information required to securely access
                  your account.
                </li>
                <li>
                  Profile information such as your selected account role
                  and profile details.
                </li>
                <li>
                  Event information submitted by event organisers.
                </li>
                <li>
                  Ticket, order, and transaction-related information
                  required to provide ticketing services.
                </li>
                <li>
                  Information you voluntarily provide while using the
                  platform.
                </li>
                <li>
                  Technical information necessary to operate and secure
                  the application.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                3. Google Sign-In
              </h2>

              <p>
                EventFlow allows you to create an account or sign in using
                Google. When you choose Google Sign-In, Google may provide
                us with information associated with your Google account,
                such as your name, email address, profile picture, and
                other information permitted by the authentication
                permissions you approve.
              </p>

              <p className="mt-3">
                We use this information to create and maintain your
                EventFlow account, authenticate you, display relevant
                profile information, and provide the services requested
                through the platform.
              </p>

              <p className="mt-3">
                EventFlow does not sell Google user data. We do not use
                Google user data for advertising or unrelated purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                4. How We Use Information
              </h2>

              <p>We may use collected information to:</p>

              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Create and manage user accounts.</li>
                <li>Authenticate users and maintain secure sessions.</li>
                <li>Provide event discovery and ticketing features.</li>
                <li>Allow organisers to create and manage events.</li>
                <li>Process and manage ticket orders.</li>
                <li>Provide customer support.</li>
                <li>Maintain and improve the platform.</li>
                <li>Detect, prevent, and investigate abuse or security issues.</li>
                <li>Comply with applicable legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                5. Authentication and Service Providers
              </h2>

              <p>
                EventFlow uses third-party technology providers to help
                operate the application. These providers may process
                information on our behalf when necessary to provide their
                services.
              </p>

              <p className="mt-3">
                Authentication and application data may be stored and
                processed using Supabase. Google is used as an optional
                authentication provider when you choose Google Sign-In.
                Payment services may also process transaction information
                when you purchase tickets.
              </p>

              <p className="mt-3">
                These services may process information according to their
                own privacy policies and applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                6. Data Storage and Security
              </h2>

              <p>
                We take reasonable technical and organisational measures
                to protect information against unauthorised access,
                alteration, disclosure, or destruction.
              </p>

              <p className="mt-3">
                However, no internet-based service can guarantee absolute
                security. You should use appropriate security practices,
                including keeping your account credentials confidential.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                7. Data Retention
              </h2>

              <p>
                We retain information for as long as reasonably necessary
                to provide the service, maintain legitimate business and
                security records, resolve disputes, comply with legal
                obligations, and enforce our agreements.
              </p>

              <p className="mt-3">
                When information is no longer required for these purposes,
                we may delete or anonymise it in accordance with applicable
                requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                8. Your Choices and Data Requests
              </h2>

              <p>
                You may request access to, correction of, or deletion of
                personal information associated with your EventFlow
                account, subject to applicable legal and operational
                requirements.
              </p>

              <p className="mt-3">
                If you want to request deletion of your account or personal
                information, contact us using the email address provided
                below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                9. Cookies and Sessions
              </h2>

              <p>
                EventFlow may use browser storage, cookies, or similar
                technologies where necessary to maintain authentication
                sessions, remember preferences, provide security, and
                operate the application.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                10. Children's Privacy
              </h2>

              <p>
                EventFlow is not intended for children who are not legally
                permitted to use the service. We do not knowingly collect
                personal information from children in violation of
                applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                11. Changes to This Privacy Policy
              </h2>

              <p>
                We may update this Privacy Policy when the platform,
                services, or applicable requirements change. Updated
                versions will be published on this page with a revised
                "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                12. Contact Us
              </h2>

              <p>
                If you have questions about this Privacy Policy, your
                personal information, or an account deletion request,
                contact us at:
              </p>

              <p className="mt-3 font-medium text-foreground">
                chigyodzerterungwa@gmail.com
              </p>
            </section>

            <div className="pt-6 border-t border-border">
              <p>
                By using EventFlow, you acknowledge that you have read and
                understood this Privacy Policy.
              </p>

              <p className="mt-3">
                <Link
                  to="/terms-of-service"
                  className="text-primary hover:underline"
                >
                  Read our Terms of Service
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
