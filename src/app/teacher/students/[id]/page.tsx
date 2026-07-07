import ClientPage from "./client-page";

export default async function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return <ClientPage id={resolvedParams.id} />;
}
