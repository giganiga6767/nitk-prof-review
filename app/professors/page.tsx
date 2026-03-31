// app/professors/page.tsx
// Public professor directory — grouped by department, sortable, searchable.
// Server component loads data; client component handles filtering/sorting.
import { Suspense }    from "react";
import DirectoryClient from "@/components/DirectoryClient";
import { getPublicProfessors, type PublicProfessor } from "@/app/actions";

export const revalidate = 120;

export default async function ProfessorsPage() {
  const professors = await getPublicProfessors();
  return (
    <Suspense>
      <DirectoryClient professors={professors} />
    </Suspense>
  );
}
