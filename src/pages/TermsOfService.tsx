import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { APP_NAME } from "@/constants";

export default function TermsOfService() {
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
              <FileText className="size-6 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Terms of Service
              </h1>

              <p className="text-sm text-muted-foreground mt-1">
                Last updated: August 23, 2026
              </p>
            </div>
          </div>

          <div className="space-y-8 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                1. Acceptance of Terms
              </h2>

              <p>
                These Terms of Service govern your use of {APP_NAME}
                ("EventFlow", "we", "us", or "our"). By accessing or using
                EventFlow, you agree to comply with these Terms.
              </p>

              <p className="mt-3">
                If you do not agree with these Terms, you should not use
                the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                2. EventFlow Accounts
              </h2>

              <p>
                You may need an account to access certain EventFlow
                features. You are responsible for providing accurate
                information and maintaining the security of your account.
              </p>

              <p className="mt-3">
                You must not impersonate another person or create an
                account using information that you do not have permission
                to use.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                3. Event Organisers
              </h2>

              <p>
                Organisers are responsible for the accuracy of the events,
                ticket information, prices, dates, locations, descriptions,
                and other information they publish.
              </p>

              <p className="mt-3">
                Organisers must have the necessary authority and permissions
                to create and promote the events they publish on EventFlow.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                4. Attendees and Tickets
              </h2>

              <p>
                Attendees are responsible for reviewing event details,
                ticket information, dates, locations, and applicable
                conditions before completing a purchase.
              </p>

              <p className="mt-3">
                A ticket may be subject to additional terms established by
                the event organiser.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                5. Payments and Refunds
              </h2>

              <p>
                Where ticket purchases are available through EventFlow,
                payment processing may be provided through third-party
                payment services.
              </p>

              <p className="mt-3">
                Refunds, cancellations, event postponements, and event
                cancellations may be subject to the policies of the event
                organiser and applicable payment-provider procedures.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                6. Prohibited Activities
              </h2>

              <p>You must not use EventFlow to:</p>

              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Break applicable laws or regulations.</li>
                <li>Commit fraud or misrepresent an event.</li>
                <li>Impersonate another person or organisation.</li>
                <li>Upload malicious software or harmful content.</li>
                <li>Attempt to gain unauthorised access to the platform.</li>
                <li>Abuse, disrupt, or interfere with the service.</li>
                <li>Use EventFlow for activities that violate the rights of others.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                7. User Content
              </h2>

              <p>
                You retain responsibility for content you submit to
                EventFlow. By submitting content, you represent that you
                have the necessary rights and permissions to publish it.
              </p>

              <p className="mt-3">
                We may remove content that violates these Terms, applicable
                law, or the safety and integrity of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                8. Intellectual Property
              </h2>

              <p>
                EventFlow's software, design, branding, interface, and
                original materials are protected by applicable intellectual
                property laws.
              </p>

              <p className="mt-3">
                You may not copy, modify, distribute, reverse engineer, or
                commercially exploit protected EventFlow materials without
                appropriate permission.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                9. Third-Party Services
              </h2>

              <p>
                EventFlow may integrate with third-party services including
                authentication, payment, hosting, analytics, or other
                technology providers.
              </p>

              <p className="mt-3">
                Your use of third-party services may also be subject to
                those providers' own terms and policies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                10. Availability
              </h2>

              <p>
                We aim to keep EventFlow available and reliable, but we do
                not guarantee uninterrupted or error-free operation.
                Maintenance, technical failures, third-party outages, or
                circumstances outside our reasonable control may affect
                availability.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                11. Account Suspension or Termination
              </h2>

              <p>
                We may suspend or terminate access to an account when
                reasonably necessary to protect EventFlow, its users, or
                comply with applicable law, including where a user violates
                these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                12. Limitation of Liability
              </h2>

              <p>
                To the extent permitted by applicable law, EventFlow is not
                responsible for losses resulting from events, transactions,
                content, third-party services, interruptions, or actions of
                other users that are outside our reasonable control.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                13. Changes to These Terms
              </h2>

              <p>
                We may update these Terms when necessary. Updated Terms will
                be published on this page with a revised "Last updated"
                date.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                14. Contact
              </h2>

              <p>
                Questions regarding these Terms can be sent to:
              </p>

              <p className="mt-3 font-medium text-foreground">
                chigyodzerterungwa@gmail.com
              </p>
            </section>

            <div className="pt-6 border-t border-border">
              <p>
                By using EventFlow, you acknowledge that you have read,
                understood, and agreed to these Terms of Service.
              </p>

              <p className="mt-3">
                <Link
                  to="/privacy-policy"
                  className="text-primary hover:underline"
                >
                  Read our Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
