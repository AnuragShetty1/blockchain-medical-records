export default function Header() {
  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-bold text-teal-600">
          MediLedger
        </div>
        <div>
          <button className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-full">
            Connect Wallet
          </button>
        </div>
      </nav>
    </header>
  );
}
