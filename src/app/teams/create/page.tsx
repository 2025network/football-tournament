import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TeamCreateForm } from "@/components/TeamCreateForm";

export default function CreateTeamPage() {
  return <main className="min-h-screen bg-slate-950 text-white"><Navbar /><TeamCreateForm /><Footer /></main>;
}