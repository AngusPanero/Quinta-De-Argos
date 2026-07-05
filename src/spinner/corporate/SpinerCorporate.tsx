import "./spinnerCorporate.css"
import { UseTheme } from "../../contexts/ThemeContext";

interface SpinnerProps {
  message?: string;
}

const SpinnerCorporate = ({ message = "Procesando" }: SpinnerProps) => {
  const { theme } = UseTheme();

  return (
    <div className={`spinner-overlay ${theme}`}>
      <div className="spinner-container">
        <div className="custom-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-core"></div>
        </div>
        {message && <p className="spinner-text">{message}</p>}
      </div>
    </div>
  );
};

export default SpinnerCorporate;