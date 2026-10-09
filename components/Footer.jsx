import Image from "next/image";
import { MODEL_CREDITS } from "@/lib/journey3d/config";

export default function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-top">
        <Image src="/logo.png" alt="Bobby Group" width={680} height={264} className="footer-logo" />
        <a className="btn btn-blue" href="mailto:info@bobbygroup.in">Send an enquiry</a>
      </div>
      <div className="footer-cols">
        <div><h3>Address</h3><p>Bengaluru, Karnataka – 560083</p></div>
        <div><h3>Phone</h3><p><a href="tel:+919880355284">+91 98803 55284</a></p></div>
        <div><h3>Email</h3><p><a href="mailto:info@bobbygroup.in">info@bobbygroup.in</a></p></div>
      </div>
      <p className="footer-legal">© 2026 Bobby Group. All rights reserved.</p>
      <p className="footer-credits">
        3D models:{" "}
        {MODEL_CREDITS.map((m, i) => (
          <span key={m.url}>
            <a href={m.url} target="_blank" rel="noopener noreferrer">{m.title}</a> by {m.author} ({m.license}){i < MODEL_CREDITS.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>
    </footer>
  );
}
