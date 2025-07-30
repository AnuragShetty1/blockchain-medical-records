import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Web3Provider } from "@/context/Web3Context";
import { Toaster } from "react-hot-toast"; // Import the Toaster component

export const metadata = {
  title: "MediLedger",
  description: "A decentralized medical records management system.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800">
        <Web3Provider>
          {/* This component will render all our toast notifications */}
          <Toaster
            position="top-center"
            reverseOrder={false}
          />
          <Header />
          <main>{children}</main>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
