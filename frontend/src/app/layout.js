import "./globals.css";
import { AuthProvider } from '../contexts/AuthContext';

export const metadata = {
  title: "StepOne - Stop Building Blind",
  description: "Validate any startup idea in 5 minutes. Get real-sounding customer feedback, question coaching, and deck-ready insights—all powered by AI.",
  keywords: "startup validation, customer discovery, AI personas, mock interviews, startup ideas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
