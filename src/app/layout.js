import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Web3Provider } from "@/context/Web3Context"; // Import the provider

export const metadata = {
  title: "MediLedger",
  description: "A decentralized medical records management system.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800">
        <Web3Provider> {/* Wrap everything with the provider */}
          <Header />
          <main>{children}</main>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
