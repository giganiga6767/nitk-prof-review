import DossierClient from "./DossierClient";
import { getProfessorDossier } from "@/app/actions";

export default async function ProfessorDossierPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. Safely unwrap the Next.js 15 Promise
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // 2. Fetch the data directly on the server (No spinners!)
  const dossier = await getProfessorDossier(id);

  // 3. Pass the fully loaded data into the UI
  return <DossierClient id={id} initialDossier={dossier} />;
}