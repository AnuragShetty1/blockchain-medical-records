"use client"; // This component is now interactive, so it must be a client component

import { useWeb3 } from "@/context/Web3Context"; // Import our custom hook

export default function Header() {
  const { account, connectWallet } = useWeb3(); // Get account and connect function from context

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-bold text-teal-600">
          MediLedger
        </div>
        <div>
          <button
            onClick={connectWallet} // Call the connectWallet function on click
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-full"
          >
            {/* If account exists, show shortened address. Otherwise, show "Connect Wallet" */}
            {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : "Connect Wallet"}
          </button>
        </div>
      </nav>
    </header>
  );
}