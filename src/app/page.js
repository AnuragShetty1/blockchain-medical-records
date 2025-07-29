import RegistrationForm from "@/components/RegistrationForm";

export default function Home() {
  return (
    // We changed the styling here to center the form on the page
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
      <RegistrationForm />
    </div>
  );
}