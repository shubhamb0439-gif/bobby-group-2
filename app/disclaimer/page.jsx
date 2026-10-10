import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Disclaimer | Bobby Group",
  description: "Disclaimer for information published on the Bobby Group website.",
};

export default function Disclaimer() {
  return (
    <LegalPage title="Disclaimer" effective="4 October 2026" updated="4 October 2026">
      <p>
        The information provided on{" "}
        <a href="https://www.bobbygroup.in" target="_blank" rel="noopener noreferrer">
          https://www.bobbygroup.in
        </a>{" "}
        is published by BOBBY GROUP for general business and informational purposes.
      </p>

      <h2>1. General Information</h2>
      <p>
        We make reasonable efforts to ensure that information presented on our website is accurate
        and useful.
      </p>
      <p>
        However, product availability, prices, specifications, photographs, crop information, origin,
        packaging, delivery estimates and other information may change without notice.
      </p>
      <p>
        Website information should not be considered a binding quotation, purchase order, guarantee
        or sales contract unless expressly confirmed by BOBBY GROUP in writing.
      </p>

      <h2>2. Agricultural Products</h2>
      <p>Spices and agricultural commodities may naturally vary because of:</p>
      <ul>
        <li>Crop</li>
        <li>Season</li>
        <li>Origin</li>
        <li>Harvest conditions</li>
        <li>Processing</li>
        <li>Storage</li>
        <li>Transportation</li>
        <li>Natural characteristics of agricultural products.</li>
      </ul>
      <p>
        Actual product characteristics should therefore be determined by the specifications agreed
        for the particular transaction.
      </p>

      <h2>3. Product Information</h2>
      <p>
        Any product specifications displayed on our website are provided for general information.
      </p>
      <p>
        Specific commercial requirements, including moisture, size, colour, ASTA value, SHU, pesticide
        residue limits, microbiological parameters and other quality requirements, should be
        expressly agreed before purchase.
      </p>

      <h2>4. Prices</h2>
      <p>
        Prices shown on the website, if any, may be indicative and may change because of
        commodity-market conditions, availability, freight, exchange rates, taxes and other commercial
        factors.
      </p>
      <p>
        Only a written quotation or sales contract issued by BOBBY GROUP should be relied upon as the
        applicable commercial price for a transaction.
      </p>

      <h2>5. International Regulations</h2>
      <p>Import requirements differ between countries.</p>
      <p>
        The buyer/importer is responsible for determining whether a product complies with applicable
        laws and import requirements in the destination country unless BOBBY GROUP has expressly
        agreed otherwise in writing.
      </p>

      <h2>6. Third-Party Websites</h2>
      <p>Our website may contain links to third-party websites.</p>
      <p>
        BOBBY GROUP does not control and is not responsible for the accuracy, availability, security
        or privacy practices of third-party websites.
      </p>

      <h2>7. No Professional Advice</h2>
      <p>
        Information on this website does not constitute legal, tax, customs, financial, investment or
        other professional advice.
      </p>
      <p>Visitors should obtain appropriate professional advice where necessary.</p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by applicable law, BOBBY GROUP shall not be liable for losses
        arising solely from reliance on general information published on this website where no
        specific contractual obligation exists.
      </p>
      <p>Nothing in this Disclaimer excludes liability that cannot legally be excluded.</p>

      <h2>9. Changes</h2>
      <p>BOBBY GROUP may modify this Disclaimer at any time.</p>
      <p>The latest version will be published on this page.</p>

      <h2>10. Contact</h2>
      <p>Our contact details are set out below.</p>
    </LegalPage>
  );
}
