import { Link } from 'react-router-dom';
import { LegalMarketingShell } from '@/components/legal/LegalMarketingShell';
import { LegalSection, LegalUnorderedList } from '@/components/legal/LegalSection';
import { LEGAL_CONTACT_EMAIL } from '@/constants/legal';

export function PrivacyPolicyPage() {
  return (
    <LegalMarketingShell title="Privacy Policy">
      <LegalSection title="1. Introduction">
        <p>
          This Privacy Policy describes how NeoEngine collects, uses, stores, and shares information when
          you use our mobile applications (including the NeoEngine app for Android and iOS),
          our web dashboard, and related services (together, the &quot;Services&quot;). It is intended to
          support transparency for app store reviews (Google Play and Apple App Store) and to meet common
          expectations under privacy laws.
        </p>
        <p>
          NeoEngine is a business-to-business (&quot;B2B&quot;) workforce and operations platform. In
          typical deployments, your <strong>employer or organization</strong> (the business customer)
          decides <em>why</em> and <em>how</em> staff data is processed for HR, attendance, and
          operations. Where that organization is the &quot;data controller&quot; under law, we act as a
          &quot;data processor&quot; on their instructions; we also act as a controller for certain
          account, technical, and service-improvement processing described below.
        </p>
        <p>
          By using the Services, you acknowledge this Policy. If you do not agree, do not use the
          Services. Also see our{' '}
          <Link to="/terms-of-service" className="text-primary font-medium hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Who this applies to">
        <LegalUnorderedList
          items={[
            <>
              <strong>Business owners and administrators</strong> who register outlets, manage staff, and
              configure NeoEngine (web dashboard and mobile).
            </>,
            <>
              <strong>Staff and managers</strong> who use the mobile app for attendance, tasks, issues,
              payroll-related workflows, and related features.
            </>,
            <>
              <strong>Platform operators</strong> (our internal super-admin tools) for onboarding and
              support of business customers.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Information we collect">
        <h3 className="text-lg font-medium text-slate-800">3.1 Account and authentication</h3>
        <LegalUnorderedList
          items={[
            <>
              <strong>Owner accounts:</strong> name, email address, phone number, and a password (stored
              using one-way hashing on our servers). Owners may sign in with email or phone depending on
              configuration.
            </>,
            <>
              <strong>Staff accounts:</strong> name, phone number (used as a primary identifier at an
              outlet), password or temporary credentials as configured by the organization, and login
              timestamps.
            </>,
            <>
              <strong>Super admin accounts:</strong> name, email, phone, and hashed password for operating
              the platform.
            </>,
            <>
              <strong>One-time passwords (OTP):</strong> when phone-based OTP login is enabled, we process
              phone numbers and OTP codes to verify identity. OTP artifacts are short-lived.
            </>,
            <>
              <strong>Session security:</strong> authentication tokens you receive after login are stored
              on your device and sent with API requests.
            </>,
            <>
              <strong>Device snapshot at login:</strong> when the app reports it, we may store a snapshot
              such as device brand, manufacturer, model, OS name/version, platform (Android/iOS), app
              version/build, device type, and an app-provided device identifier string. This supports
              security and troubleshooting tied to your account.
            </>,
            <>
              <strong>Outlet and location records:</strong> for each site the customer operates, we store
              identifiers such as outlet name, address, phone, optional tax identifiers (for example GST),
              geofence latitude/longitude/radius used for attendance rules, timezone, payroll and operational
              settings, and internal rules text presented to staff.
            </>,
          ]}
        />

        <h3 className="text-lg font-medium text-slate-800 pt-2">
          3.2 Workforce, HR, and profile information (organization-controlled)
        </h3>
        <p>
          Organizations may enter or import extensive staff profiles. Depending on how your employer uses
          NeoEngine, this can include:
        </p>
        <LegalUnorderedList
          items={[
            <>
              Employment details: salary, joining date, shift type (e.g. day/night), department, role,
              reporting hierarchy (who reports to whom), scheduled punch-in time overrides, minimum hours
              per day, payroll eligibility dates.
            </>,
            <>
              Identity and tax/payroll identifiers: bank account number, IFSC, PAN, PF number, ESIC
              number, UPI ID for payouts.
            </>,
            <>
              Personal details: date of birth, gender, addresses (local, temporary, permanent), optional
              &quot;location link&quot; and resolved place labels/coordinates stored as profile fields,
              guardian and secondary phone numbers.
            </>,
            <>
              Health and safety related optional fields: medical condition flags and notes; visible body
              marks description; optional photo of body marks; police verification status and notes.
            </>,
            <>
              Profile photo URL and documents (see uploads).
            </>,
            <>
              Acknowledgement of outlet rules: version numbers and agreement state for workplace policies
              shown in-app.
            </>,
            <>
              Feature flags and permissions: per-user mobile feature permission maps set by the
              organization.
            </>,
          ]}
        />

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.3 Face verification and biometrics</h3>
        <p>
          For attendance and related verification flows, the app uses the device camera. Our backend is
          designed to store <strong>mathematical face representations (embeddings)</strong> and related
          geometric feature vectors—not raw photographs—in order to verify identity on supported flows.
          Legacy or supplementary fields may include template strings associated with an employee record.
        </p>
        <p>We may also store verification audit data, such as:</p>
        <LegalUnorderedList
          items={[
            <>
              Whether a face match was detected or passed, match scores, verification mode (e.g. device vs
              emulator), quality scores, failure reasons, model version, timing metrics, session/attempt
              identifiers, and optional device metadata associated with an attempt.
            </>,
            <>
              Registration metadata such as who enrolled a profile (including colleague-assisted
              enrollment where enabled).
            </>,
          ]}
        />
        <p>
          <strong>Important:</strong> Biometric and face-related processing is sensitive. Organizations
          should only enable this where legally permitted and with appropriate notices to staff. You may
          deny camera permission, but features that require face verification will not work.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.4 Location</h3>
        <p>We process location for workforce compliance and attendance, including:</p>
        <LegalUnorderedList
          items={[
            <>
              <strong>Punch / attendance events:</strong> latitude and longitude captured when you punch
              in/out or during verification flows tied to attendance.
            </>,
            <>
              <strong>Location logs during work:</strong> periodic or event-driven records that may
              include latitude, longitude, accuracy, timestamps, whether you are inside an employer
              geofence, estimated distance from outlet, battery level, movement-related signals (e.g.
              speed), mock/fake location flags, provider name, punch session linkage, and &quot;away&quot;
              period linkage when you leave an expected area.
            </>,
            <>
              <strong>Live status fields on an employee profile</strong> such as last known location
              status (inside / away / far away / offline / unknown) and last update time for operational
              visibility to authorized managers.
            </>,
            <>
              <strong>Post-shift location enforcement:</strong> where enabled by the organization,
              outcomes and evidence metadata may be stored to support compliance workflows after a shift.
            </>,
          ]}
        />
        <p>
          On Android, our app configuration may request <strong>foreground</strong> and, where enabled,{' '}
          <strong>background</strong> location and foreground service permissions so tracking can continue
          during a shift as the employer configures. iOS location use is requested in line with Apple
          guidelines when those features are used.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">
          3.5 Tasks, issues, chat, and collaborative content
        </h3>
        <LegalUnorderedList
          items={[
            <>
              <strong>Tasks and assignments:</strong> titles, instructions, schedules, completion status,
              on-time/late flags, free-text notes, checklist items, and proof media (photos and videos)
              uploaded as evidence. When the app sends it, we may also store the{' '}
              <strong>GPS coordinates at completion</strong> for a task assignment. Analytics may be
              derived from task completion for dashboards.
            </>,
            <>
              <strong>Issues/tickets and threads:</strong> titles, descriptions, status, priority,
              assignees, participants, message text, replies, mentions, timestamps, linked tasks, and{' '}
              <strong>attachments</strong> which may include images, videos, audio recordings, generic
              files, shared contact cards, and shared map/location pins. Attachments are stored as URLs to
              files we or our infrastructure providers host on behalf of the organization.
            </>,
            <>
              <strong>Optional rich metadata</strong> on messages (e.g. voice message metadata, contact
              sharing metadata, location message metadata) when those message types are used.
            </>,
          ]}
        />

        <h3 className="text-lg font-medium text-slate-800 pt-2">
          3.6 Documents (ID, bank, police verification, etc.)
        </h3>
        <p>
          Organizations can store staff documents (type, file name, file URL, size). These may contain
          highly sensitive personal data depending on what is uploaded.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.7 Attendance, time, and payroll</h3>
        <p>
          We process punch in/out and break events, shift aggregates, overtime requests (including
          descriptions and <strong>supporting photo URLs</strong> you attach), overtime approvals with
          reviewer references, leave requests and balances, payroll periods, payments, configuration, and
          audit logs needed to run payroll logic chosen by the organization.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.8 Notifications</h3>
        <LegalUnorderedList
          items={[
            <>
              <strong>Push tokens:</strong> we store Expo push notification tokens mapped to your user id
              and role type (employee or owner) for delivery via Expo / platform push services (on
              Android, Firebase Cloud Messaging may be used under the hood).
            </>,
            <>
              <strong>In-app notification records:</strong> titles, bodies, payload data, read state, for
              history in the product.
            </>,
            <>
              <strong>Android:</strong> the app may use high-priority channels, custom sounds, and{' '}
              <strong>full-screen intent</strong> capability for time-sensitive task alerts where
              enabled—so critical workforce alerts can surface when the device allows it.
            </>,
          ]}
        />

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.9 Voice audio (dashboard and backend)</h3>
        <p>
          On the <strong>web dashboard</strong>, owners may use voice features. When you record audio for
          those features, your browser sends an audio file to our servers. Our backend may send that audio
          to <strong>OpenAI</strong> (or similar configured providers) for speech-to-text and, in some
          flows, structured extraction (for example: navigate to a screen, create a task draft, or create
          staff from spoken instructions). Transcripts and derived structured data are used to fulfill
          the request; audio is retained only as long as needed for processing, logging, and abuse
          prevention under our configuration—refer to your organization’s agreement with us for data
          processing terms.
        </p>
        <p>
          Voice notes or audio attachments in <strong>issue chat</strong> are stored as file uploads
          like other attachments and may be played back by authorized users in the thread.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.10 Contacts (optional, device)</h3>
        <p>
          If you use features that import staff from your phone contacts, the app requests{' '}
          <strong>contacts access</strong> on your device. Contact data is used for the import flow you
          start and is processed in line with that feature. On Android, <strong>WRITE_CONTACTS</strong> may
          appear in the app manifest because bundled contact-related libraries or capabilities declare
          it—your employer’s use case may be read-only or import-only in practice.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.11 Photos, camera, storage</h3>
        <p>
          The app requests <strong>camera</strong> and <strong>photo library / media</strong> access for
          profile photos, document capture, task evidence, issue attachments, and similar flows. On Android,
          legacy <strong>external storage</strong> permissions may be declared for media access patterns on
          older APIs.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.12 Maps and place search</h3>
        <p>
          The web dashboard may call our backend place search (autocomplete/details) which relies on{' '}
          <strong>Google</strong> Places / Geocoding APIs. Queries you type and selected places can be
          processed by Google under Google’s terms.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.13 Product analytics (optional)</h3>
        <p>
          The mobile app may initialize <strong>PostHog</strong> analytics when enabled by configuration
          and feature flags. When enabled, the PostHog SDK can record product events (for example screen
          views, punch actions, task completion, issue chat events) with properties useful for debugging
          product usage. PostHog is configured with an API key and regional host (for example EU) from app
          configuration at build time.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.14 Updates and configuration</h3>
        <p>
          The Expo platform may deliver <strong>over-the-air (OTA) updates</strong> for JavaScript assets,
          and store runtime/version identifiers. Firebase configuration is used for push-related project
          linkage on Android as typical for Expo/React Native stacks.
        </p>

        <h3 className="text-lg font-medium text-slate-800 pt-2">3.15 Server logs and security</h3>
        <p>
          We maintain standard technical logs (IP address, user agent, timestamps, API routes, error
          reports) for security, reliability, and debugging.
        </p>
        <h3 className="text-lg font-medium text-slate-800 pt-2">3.16 Realtime connections</h3>
        <p>
          For features such as issue messaging, the app may open a <strong>WebSocket</strong> (Socket.IO)
          connection to our servers using your session credentials so messages can sync in near real time.
          Connection metadata may appear in server logs.
        </p>
      </LegalSection>

      <LegalSection title="4. Legal bases (summary)">
        <p>Depending on jurisdiction, we rely on:</p>
        <LegalUnorderedList
          items={[
            <>
              <strong>Contract</strong> — providing NeoEngine to the organization and its users per our
              Terms and agreements.
            </>,
            <>
              <strong>Legitimate interests</strong> — securing accounts, preventing abuse, debugging,
              improving reliability, and analytics where proportionate.
            </>,
            <>
              <strong>Legal obligation</strong> — where we must retain or disclose data by law.
            </>,
            <>
              <strong>Consent</strong> — where required for specific device permissions (camera, contacts,
              notifications, location) or marketing cookies if we add them; device OS prompts also control
              access.
            </>,
          ]}
        />
        <p>
          Where an organization is the controller for employee data, they choose the appropriate basis for
          HR processing; we process as instructed by that relationship.
        </p>
      </LegalSection>

      <LegalSection title="5. How we use information">
        <LegalUnorderedList
          items={[
            'Provide core features: attendance, geofencing, tasks, issues, documents, hierarchy, analytics views, payroll workflows.',
            'Authenticate users, protect accounts, investigate fraud or misuse.',
            'Operate push notifications and time-sensitive alerts.',
            'Run voice-to-text and command parsing for dashboard voice features through subprocessors.',
            'Improve performance, resolve incidents, and run optional product analytics.',
            'Comply with law, enforce our Terms, and protect rights and safety.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Sharing and subprocessors">
        <p>
          We share data with service providers who process it on our behalf, including but not limited to:
        </p>
        <LegalUnorderedList
          items={[
            <>
              <strong>Cloud / hosting</strong> (servers and databases that store application data).
            </>,
            <>
              <strong>Expo</strong> and mobile platform providers (<strong>Google</strong> /{' '}
              <strong>Apple</strong>) for app distribution, push delivery, and OTA updates as configured.
            </>,
            <>
              <strong>OpenAI</strong> (or other configured AI vendors) for voice transcription and parsing.
            </>,
            <>
              <strong>Google Maps / Places</strong> for address autocomplete and place resolution.
            </>,
            <>
              <strong>PostHog</strong> when analytics are enabled in the mobile build.
            </>,
          ]}
        />
        <p>
          We may also disclose information if required by law, or to protect users and the public, subject
          to applicable law.
        </p>
        <p>
          Organizations can see certain staff data within their NeoEngine tenant; they should share privacy
          notices with their employees accordingly.
        </p>
      </LegalSection>

      <LegalSection title="7. International transfers">
        <p>
          Our infrastructure or subprocessors may be located outside your country (including the United
          States, European Economic Area, or India). Where required, we use appropriate safeguards such as
          standard contractual clauses or equivalent mechanisms in agreements with customers or vendors.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention">
        <p>
          We retain information for as long as the organization maintains an active account, and as needed
          to provide the Services, comply with law, resolve disputes, and enforce agreements. Specific
          retention schedules may be agreed with enterprise customers. Backup copies may persist for a
          limited time after deletion.
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          We use administrative, technical, and organizational measures appropriate to the risk, including
          encrypted transport (HTTPS), access controls, and hashed passwords. No method of transmission or
          storage is 100% secure.
        </p>
      </LegalSection>

      <LegalSection title="10. Your rights and choices">
        <p>
          Subject to your jurisdiction, you may have rights to access, correct, delete, or port certain
          personal data, or to object to or restrict some processing. Many requests must be routed through
          your employer if they control the business account. You may contact us using the email below.
          You can revoke device permissions (camera, location, contacts, notifications) in OS
          settings—some features may stop working.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          NeoEngine is not directed at children under 16. We do not knowingly collect personal information
          from children for consumer purposes. Business customers should not onboard minors in violation
          of local labor law.
        </p>
      </LegalSection>

      <LegalSection title="12. Third-party links">
        <p>
          The Services may link to third-party sites. Their practices are governed by their own policies.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to this Policy">
        <p>
          We may update this Policy from time to time. We will post the updated version and revise the
          &quot;Last updated&quot; date. Material changes may require additional notice under law or
          contract with customers.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          For privacy questions or requests regarding NeoEngine, contact{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . Enterprise customers may also use the support channel set out in their subscription agreement.
        </p>
        <p>
          To request deletion of your account and associated personal data, use our{' '}
          <Link to="/account-deletion" className="text-primary font-medium hover:underline">
            account deletion
          </Link>{' '}
          page or email us at the address above with the subject line &quot;Account &amp; personal data
          deletion request&quot;.
        </p>
      </LegalSection>
    </LegalMarketingShell>
  );
}
