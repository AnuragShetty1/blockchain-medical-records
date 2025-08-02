"use client";

import { useWeb3 } from "@/context/Web3Context";

export default function Header() {
  const { account, connectWallet, userProfile } = useWeb3(); // [MODIFIED] Get userProfile from context

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-bold text-teal-600">
          MediLedger
        </div>
        <div className="flex items-center space-x-4">
          {/* [NEW] Display user's name if profile is loaded */}
          {userProfile && userProfile.name && (
            <span className="text-slate-600 font-semibold hidden sm:block">
              Welcome, {userProfile.name}
            </span>
          )}
          <button
            onClick={connectWallet}
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-full transition-colors"
          >
            {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : "Connect Wallet"}
          </button>
        </div>
      </nav>
    </header>
  );
}
