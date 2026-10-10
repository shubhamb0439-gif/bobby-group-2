export const CONTACT = {
  email: "info@bobbygroup.in",
  phoneDisplay: "+91 98803 55284",
  phoneHref: "+919880355284",
  whatsapp: "919880355284",
  whatsappMessage: "Hello Bobby Group, I would like to enquire about your spices.",
  enquiryForm:
    "https://docs.google.com/forms/d/e/1FAIpQLSe7ufNrTT7mXE3dFTjYuGlJz5PPEg6lr8XrdsLuwH-AapePvQ/viewform",
  address: {
    line1: "#31, 1st Cross, JP Nagar 8th Phase",
    line2: "Bangalore – 560083",
    line3: "Karnataka, India",
  },
};

export const whatsappLink = () =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(CONTACT.whatsappMessage)}`;
