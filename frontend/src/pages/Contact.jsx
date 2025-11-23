import PageWrapper from "../ui/PageWrapper.jsx";

export default function Contact() {
  return (
    <PageWrapper>
      <h2 className="text-center mb-3">Contact</h2>

      <p className="mb-3">Feel free to reach me anytime.</p>

      <a href="mailto:your@email.com"
         className="btn btn-primary w-100">
         Send Email
      </a>
    </PageWrapper>
  );
}
