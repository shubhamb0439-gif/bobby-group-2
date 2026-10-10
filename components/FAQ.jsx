"use client";

import { useState } from "react";
import { CONTACT } from "@/lib/contact";

const TABS = ["All", "General", "Quality", "Pricing", "Shipping", "Documents", "Payments", "Contact"];

const FAQS = [
  {
    cat: "General",
    q: "What is BOBBY GROUP?",
    a: "BOBBY GROUP is an India-based business focused on supplying and exporting spices to domestic and international markets. We aim to provide quality products, competitive quotations, and reliable coordination throughout the procurement and export process.",
  },
  {
    cat: "General",
    q: "Which countries do you export to?",
    a: "We welcome enquiries from international buyers and can evaluate orders for different destinations based on product availability, import regulations, shipping arrangements, and commercial terms.",
  },

  {
    cat: "Quality",
    q: "How do you ensure the quality of your spices?",
    a: "Product specifications and quality requirements are discussed before order confirmation. Depending on the product and buyer's requirements, quality checks, samples, and third-party inspection may be arranged by mutual agreement.",
  },
  {
    cat: "Quality",
    q: "Can I request specific grades or sizes of spices?",
    a: "Yes. Buyers can specify their required grade, size, colour, moisture level, aroma, purity, and other relevant parameters. We will confirm availability against the requested specifications.",
  },
  {
    cat: "Quality",
    q: "Can I request a product sample before placing an order?",
    a: "Sample requests can be discussed depending on product availability, sample quantity, shipping destination, and associated costs.",
  },
  {
    cat: "Quality",
    q: "Do you provide laboratory test reports or certificates?",
    a: "Relevant laboratory reports, inspection documents, and certificates may be arranged or provided where available and applicable to the product, destination, and agreed order requirements.",
  },
  {
    cat: "Quality",
    q: "Are your spices suitable for international food markets?",
    a: "We discuss the applicable product specifications and destination-country requirements with buyers before finalising orders. Compliance depends on the product, applicable regulations, and the documentation and testing required for the shipment.",
  },

  {
    cat: "Pricing",
    q: "What is your minimum order quantity (MOQ)?",
    a: "The minimum order quantity depends on the product, grade, packaging, and destination. Please contact our team with your required quantity for confirmation.",
  },
  {
    cat: "Pricing",
    q: "How can I get a price quotation?",
    a: "Send us the product name, grade or size, quantity, packaging preference, destination country or port, and preferred shipping method. Our team will review the requirements and provide a quotation.",
  },
  {
    cat: "Pricing",
    q: "Are your prices fixed?",
    a: "Prices may change depending on market conditions, product grade, order quantity, availability, packaging, freight costs, and currency fluctuations. Each quotation will specify its validity period.",
  },
  {
    cat: "Pricing",
    q: "Do you offer bulk pricing?",
    a: "Yes. Bulk requirements can be evaluated based on order volume, product specifications, supply availability, and delivery terms.",
  },
  {
    cat: "Pricing",
    q: "Are transportation, taxes, and shipping charges included in the quotation?",
    a: "The quotation will specify which costs are included and which are additional. Depending on the agreed terms, charges may include inland transportation, packaging, freight, insurance, applicable taxes, and destination-related expenses.",
  },

  {
    cat: "Shipping",
    q: "What packaging options do you offer?",
    a: "Packaging can be discussed according to the product, order quantity, buyer requirements, and destination regulations. Available options may include bulk bags, food-grade packaging, and customised packaging where feasible.",
  },
  {
    cat: "Shipping",
    q: "Which shipping methods are available?",
    a: "Depending on the shipment, destination, and cargo requirements, orders may be arranged by sea freight, air freight, or road transport for suitable domestic and cross-border routes.",
  },
  {
    cat: "Shipping",
    q: "How long does international delivery take?",
    a: "Delivery time depends on the destination, shipping method, carrier schedule, customs clearance, documentation, and other logistical factors. Estimated transit times will be communicated during order confirmation where available.",
  },
  {
    cat: "Shipping",
    q: "Can you ship directly to my destination port or warehouse?",
    a: "Destination-port delivery or other agreed delivery arrangements can be evaluated based on the shipping route, order size, applicable Incoterms\u00ae, and logistics availability.",
  },
  {
    cat: "Shipping",
    q: "Can I track my shipment?",
    a: "Where shipment tracking is available, we can share the relevant tracking details or shipping updates provided by the carrier or logistics partner.",
  },

  {
    cat: "Documents",
    q: "What export documents can you provide?",
    a: "Depending on the product and transaction, documents may include a commercial invoice, packing list, shipping or transport documents, certificate of origin, and applicable inspection, phytosanitary, or other certificates where required and available.",
  },
  {
    cat: "Documents",
    q: "Do you support buyers with customs documentation?",
    a: "We coordinate the export documents applicable to our part of the transaction. Buyers or their appointed customs brokers are responsible for confirming destination-country import requirements and completing their respective clearance obligations.",
  },
  {
    cat: "Documents",
    q: "Can you provide a Certificate of Origin?",
    a: "A Certificate of Origin may be arranged when applicable and subject to the relevant issuing authority's requirements and the availability of supporting documents.",
  },
  {
    cat: "Documents",
    q: "Do you support specific destination-country requirements?",
    a: "We can review the requirements communicated by the buyer and assess the documentation, product specifications, and certifications needed for the intended market before accepting the order.",
  },

  {
    cat: "Payments",
    q: "What payment methods do you accept?",
    a: "Payment methods and terms are agreed in writing before an order is confirmed. Depending on the transaction, bank transfers and other mutually agreed business payment arrangements may be considered.",
  },
  {
    cat: "Payments",
    q: "What are your payment terms?",
    a: "We consider prior advance payment inco-terms as mutually agreed upon.",
  },
  {
    cat: "Payments",
    q: "How do I place an order?",
    a: "Contact us with your product requirements. After confirming specifications, quantity, pricing, packaging, delivery terms, and payment conditions, we will communicate the next steps for order confirmation and shipment.",
  },
  {
    cat: "Payments",
    q: "Can I modify or cancel a confirmed order?",
    a: "Any modification or cancellation is subject to the agreed sales contract, procurement status, production or packing progress, and shipping arrangements. Please contact us as soon as possible if a change is required.",
  },
  {
    cat: "Payments",
    q: "What happens if goods arrive damaged or do not match the agreed specifications?",
    a: "Please notify us promptly and provide the relevant order details, photographs, inspection findings, and supporting documents. Any claim will be reviewed against the agreed specifications, contractual terms, and available evidence.",
  },

  {
    cat: "Contact",
    q: "How can I contact BOBBY GROUP for a business enquiry?",
    a: (
      <>
        You can contact us through our website or email us at{" "}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. For a faster quotation, include
        the product name, required quantity, destination, and preferred shipping method.
      </>
    ),
  },
  {
    cat: "Contact",
    q: "Do you accept long-term supply contracts?",
    a: "Long-term supply arrangements can be discussed based on projected demand, product availability, quality specifications, pricing arrangements, and mutually agreed contract terms.",
  },
];

export default function FAQ() {
  const [tab, setTab] = useState("All");
  const [open, setOpen] = useState(null);

  const list = tab === "All" ? FAQS : FAQS.filter((f) => f.cat === tab);

  return (
    <section id="faq" className="faq">
      <div className="section">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" /> Frequently asked questions</p>
          <h2>Everything you need to know.</h2>
          <p>
            Answers on our products, quality, pricing, shipping, documentation and payment terms
            for importers, distributors and manufacturers buying from India.
          </p>
        </div>

        <div className="faq-tabs" role="tablist" aria-label="FAQ categories">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`faq-tab${tab === t ? " is-active" : ""}`}
              onClick={() => {
                setTab(t);
                setOpen(null);
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <ul className="faq-list">
          {list.map((f) => {
            const isOpen = open === f.q;
            return (
              <li key={f.q} className={`faq-item${isOpen ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : f.q)}
                >
                  <span>{f.q}</span>
                  <svg className="faq-chevron" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="faq-a" inert={!isOpen}>
                  <p>{f.a}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="faq-cta">
          <p>Still have a question?</p>
          <a className="btn btn-blue" href={CONTACT.enquiryForm} target="_blank" rel="noopener noreferrer">
            Send an enquiry
          </a>
        </div>
      </div>
    </section>
  );
}
