import ClientPage from "./client-page";

export default function StudentDetailsPage({ params }: { params: { id: string } }) {
    return <ClientPage id={params.id} />;
}
