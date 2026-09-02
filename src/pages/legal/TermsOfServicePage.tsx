import { Link } from 'react-router-dom';
import { LegalMarketingShell } from '@/components/legal/LegalMarketingShell';
import { LegalSection, LegalUnorderedList } from '@/components/legal/LegalSection';
import { LEGAL_CONTACT_EMAIL } from '@/constants/legal';

export function TermsOfServicePage() {
  return (
    <LegalMarketingShell title="Terms of Service">
      <LegalSection title="1. Agreement">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of NeoEngine web and
          mobile services (the &quot;Services&quot;) provided by Neuoptic (&quot;NeoEngine&quot;,
          &quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By accessing or using the Services, you agree
          to these Terms. If you are using NeoEngine on behalf of a company or other legal entity, you
          represent that you have authority to bind that entity, and &quot;you&quot; refers to that
          entity.
        </p>
        <p>
          Our{' '}
          <Link to="/privacy-policy" className="text-primary font-medium hover:underline">
            Privacy Policy
          </Link>{' '}
          explains how we handle personal data. The Privacy Policy is incorporated by reference.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of the Services">
        <p>
          NeoEngine provides software for businesses to manage operations, staffing, attendance (including
          optional face verification, manual attendance proof when face verification cannot complete, and
          location-based checks), tasks, issues and internal messaging,
          documents, approvals, payroll-related workflows, analytics, and related administration through a
          web dashboard and mobile applications. Features available to you depend on your role, outlet
          configuration, and subscription/contract with NeoEngine or your organization.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and eligibility">
        <LegalUnorderedList
          items={[
            'You must provide accurate registration information and keep credentials confidential.',
            'You must be at least the minimum age required by law to enter a binding contract in your jurisdiction, and comply with employment and labor law when onboarding staff.',
            'Owners and administrators are responsible for invitations, access provisioning, and access removal for their organization.',
            'You are responsible for activity under your credentials unless caused solely by a security failure on our side.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Customer data and employer responsibility">
        <p>
          Where your organization uses NeoEngine for workforce management, the organization is typically
          responsible for the legality of its HR practices, notices to employees, and its instructions to
          us concerning personal data it controls (subject to our Privacy Policy and any data-processing
          agreement). You acknowledge that NeoEngine may process sensitive categories of data your
          organization submits—including biometric-derived vectors, location data (event-based on iOS;
          event-based and, on Android where enabled, periodic during work sessions), financial
          identifiers, health-related notes when entered, and government ID documents—solely to provide the
          Services at the organization’s direction.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You agree not to:</p>
        <LegalUnorderedList
          items={[
            'Violate any law or infringe others’ rights.',
            'Reverse engineer, scrape, overload, or probe the Services in ways that could impair them.',
            'Attempt to access data or accounts without authorization.',
            'Upload malware, harass others, or distribute unlawful content through issues, tasks, or chat.',
            'Circumvent technical limits, geofencing, or attendance controls unless your organization expressly permits it.',
            'Use the Services in violation of app store rules, OSHA/labor rules that apply to you, or export control law.',
          ]}
        />
        <p>
          We may suspend or terminate access for violations, risk to others, or legal/process requirements.
        </p>
      </LegalSection>

      <LegalSection title="6. Device permissions">
        <p>
          Mobile features may require permissions such as camera, microphone, contacts, notifications,
          location, storage/media access, and (on Android) foreground service or full-screen alert
          capabilities. You control many permissions through your device settings; denying them may limit
          functionality. You may also choose between bundled notification alert tones in app Settings;
          server-delivered push notifications may use your selected tone where the platform supports it.
        </p>
        <p>
          <strong>Location:</strong> On <strong>iOS</strong>, location is used only while the app is in use,
          at attendance-related actions (punch in/out, break start/end where required), task completion,
          shared location in messages, and explicit verification flows. Continuous background location is
          not used on iOS. On <strong>Android</strong>, foreground and, where your organization enables
          them, background location and a foreground service may be used during active work sessions (for
          example while clocked in).
        </p>
      </LegalSection>

      <LegalSection title="7. Third-party services and AI">
        <p>
          The Services may interoperate with or rely on third parties (for example: cloud infrastructure,
          mobile push providers, address search/maps providers, AI transcription providers for voice
          features, and optional analytics). Their use is subject to their terms and privacy policies. You
          authorize us to transmit data to subprocessors as needed to run the Services, as described in the
          Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual property">
        <p>
          NeoEngine retains all rights in the Services, software, branding, and documentation. Subject to
          these Terms, we grant you a limited, non-exclusive, non-transferable right to access and use the
          Services during the term of your (or your organization’s) entitlement. You retain rights in
          content you upload; you grant us a worldwide license to host, process, transmit, and display
          that content as needed to provide the Services and enforce these Terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Confidentiality and feedback">
        <p>
          Non-public aspects of the Services are our confidential information. If you give feedback, you
          grant us a perpetual, royalty-free license to use it to improve the Services without obligation
          to you.
        </p>
      </LegalSection>

      <LegalSection title="10. Availability and changes">
        <p>
          We strive for reliable operation but do not guarantee uninterrupted access. We may modify,
          deprecate, or add features; where material to paid contracts, change rights may be governed by a
          separate agreement.
        </p>
      </LegalSection>

      <LegalSection title="11. Disclaimers">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS
          AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED
          WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
          WARRANT THAT ATTENDANCE, LOCATION, FACE MATCHING, OR PAYROLL CALCULATIONS ARE ERROR-FREE OR MEET
          REGULATORY REQUIREMENTS FOR YOUR INDUSTRY—YOUR ORGANIZATION MUST VALIDATE COMPLIANCE WITH LEGAL
          AND CONTRACTUAL OBLIGATIONS.
        </p>
      </LegalSection>

      <LegalSection title="12. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER NEOENGINE NOR ITS SUPPLIERS WILL BE LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          PROFITS, DATA, GOODWILL, OR BUSINESS INTERRUPTION. OUR AGGREGATE LIABILITY FOR ALL CLAIMS ARISING
          OUT OF OR RELATED TO THE SERVICES OR THESE TERMS WILL NOT EXCEED THE AMOUNT YOU (OR YOUR
          ORGANIZATION) PAID TO US FOR THE SERVICES IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE
          TO LIABILITY, OR ONE HUNDRED US DOLLARS (USD $100) IF NO FEES APPLY, WHICHEVER IS GREATER.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations; in those jurisdictions our liability is
          limited to the greatest extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="13. Indemnity">
        <p>
          To the extent permitted by law, you will indemnify and hold harmless NeoEngine and its
          affiliates, directors, and employees from claims, damages, and costs (including reasonable
          attorneys’ fees) arising from your content, your use of the Services in violation of these
          Terms, or your violation of law or third-party rights.
        </p>
      </LegalSection>

      <LegalSection title="14. Suspension and termination">
        <p>
          You may stop using the Services at any time. We may suspend or terminate access for breach,
          risk, non-payment (where applicable), or cessation of service. Provisions that by their nature
          should survive (including intellectual property, disclaimers, limitations of liability,
          indemnity, and governing law) will survive termination.
        </p>
      </LegalSection>

      <LegalSection title="15. Governing law and disputes">
        <p>
          These Terms are governed by the laws of India, excluding conflict-of-law rules. Courts in New
          Delhi, India shall have exclusive jurisdiction, subject to mandatory consumer or employee
          protections in your jurisdiction that cannot be waived.
        </p>
      </LegalSection>

      <LegalSection title="16. Export and sanctions">
        <p>
          You may not use the Services in embargoed regions or in violation of sanctions or export control
          laws.
        </p>
      </LegalSection>

      <LegalSection title="17. App store terms">
        <p>
          If you download our mobile app from Apple App Store or Google Play, those stores’ terms may
          apply. To the extent there is a conflict relating to the store’s rules, the store’s terms govern
          only with respect to that platform, and Apple/Google are not responsible for the Services or
          support.
        </p>
      </LegalSection>

      <LegalSection title="18. Contact">
        <p>
          Questions about these Terms:{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          To request deletion of your account and associated personal data, follow the instructions on our{' '}
          <Link to="/account-deletion" className="text-primary font-medium hover:underline">
            account deletion
          </Link>{' '}
          page (also linked from our Privacy Policy). Availability of instant self-service deletion may
          depend on your role and your organization’s agreement with us; we may verify identity before
          completing a request.
        </p>
      </LegalSection>
    </LegalMarketingShell>
  );
}
