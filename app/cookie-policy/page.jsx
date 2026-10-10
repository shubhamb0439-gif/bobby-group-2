import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Cookie Policy | Bobby Group",
  description: "How Bobby Group uses cookies and similar technologies on its website.",
};

export default function CookiePolicy() {
  return (
    <LegalPage title="Cookie Policy" effective="4 October 2026" updated="4 October 2026">
      <p>
        This Cookie Policy explains how BOBBY GROUP may use cookies and similar technologies on{" "}
        <a href="https://www.bobbygroup.in" target="_blank" rel="noopener noreferrer">
          https://www.bobbygroup.in
        </a>.
      </p>

      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files that websites may store on your device when you visit them.
      </p>
      <p>
        They can help websites function properly, remember preferences and understand how visitors
        use the website.
      </p>

      <h2>2. Types of Cookies</h2>
      <p>Depending on the technology used on our website, we may use:</p>

      <h3>Essential Cookies</h3>
      <p>These cookies may be necessary for the basic operation and security of the website.</p>

      <h3>Preference Cookies</h3>
      <p>These cookies may remember certain settings or preferences.</p>

      <h3>Analytics Cookies</h3>
      <p>
        These cookies may help us understand website traffic, visitor behaviour and website
        performance.
      </p>

      <h3>Marketing or Advertising Cookies</h3>
      <p>
        If used, these cookies may help measure or personalise advertising or marketing activities.
      </p>

      <h2>3. Third-Party Services</h2>
      <p>Our website may use third-party services such as:</p>
      <ul>
        <li>Website hosting providers</li>
        <li>Analytics providers</li>
        <li>Contact-form providers</li>
        <li>Security services</li>
        <li>Embedded media</li>
        <li>Social-media services</li>
        <li>Other website technologies.</li>
      </ul>
      <p>
        These third parties may use cookies or similar technologies according to their own policies.
      </p>

      <h2>4. Managing Cookies</h2>
      <p>You can generally control or delete cookies through your web browser settings.</p>
      <p>
        Disabling certain cookies may affect the functionality or performance of parts of the
        website.
      </p>

      <h2>5. Consent</h2>
      <p>
        Where applicable law requires consent for non-essential cookies or similar technologies,
        BOBBY GROUP will seek consent through appropriate website mechanisms.
      </p>

      <h2>6. Changes to This Cookie Policy</h2>
      <p>
        We may update this Cookie Policy when our website technologies or legal requirements change.
      </p>
      <p>The updated policy will be published on this page.</p>

      <h2>7. Contact</h2>
      <p>For questions regarding this Cookie Policy, please contact us below.</p>
    </LegalPage>
  );
}
