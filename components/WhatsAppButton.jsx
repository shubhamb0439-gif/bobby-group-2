import { whatsappLink } from "@/lib/contact";

/* Floating WhatsApp button, pinned to the bottom-right on every page. */
export default function WhatsAppButton() {
  return (
    <a
      className="wa-float"
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Bobby Group on WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M16.04 3C9.4 3 4 8.39 4 15.02c0 2.3.65 4.45 1.78 6.29L4 29l7.9-1.73a12.1 12.1 0 0 0 4.14.73h.01c6.64 0 12.03-5.39 12.03-12.02C28.08 8.39 22.68 3 16.04 3Zm0 21.86h-.01a9.9 9.9 0 0 1-3.78-.73l-.27-.11-4.69 1.03 1.04-4.57-.18-.29a9.84 9.84 0 0 1-1.5-5.24c0-5.44 4.44-9.87 9.9-9.87 2.64 0 5.12 1.03 6.99 2.9a9.8 9.8 0 0 1 2.9 6.98c0 5.44-4.44 9.9-9.9 9.9Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.96-.94 1.16c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z"
        />
      </svg>
      <span className="wa-float-label">WhatsApp</span>
    </a>
  );
}
