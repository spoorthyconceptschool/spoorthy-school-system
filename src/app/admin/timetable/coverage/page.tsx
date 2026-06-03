import { redirect } from 'next/navigation';

export default function CoverageManagerPage() {
    redirect('/admin/faculty?tab=coverage');
}
