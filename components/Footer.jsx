import Image from "next/image";

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
    </footer>
  );
}
