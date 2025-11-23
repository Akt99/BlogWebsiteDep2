// frontend/src/ui/PageWrapper.jsx  (REPLACE)
import "../PageTheme.css";

export default function PageWrapper({ children }) {
  return (
    <div className="page-wrapper">
      <div className="page-overlay"></div>
      <div className="page-content-container">
        {children}
      </div>
    </div>
  );
}
