"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function InvoicePage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [transaction, setTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/login");
            return;
        }

        const fetchInvoice = async () => {
            try {
                if (!id) return;
                const docRef = doc(db, "transactions", id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setTransaction(docSnap.data());
                } else {
                    console.error("Invoice not found");
                }
            } catch (error) {
                console.error("Error fetching invoice:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [id, user, authLoading, router]);

    if (loading || authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-white text-black"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    if (!transaction) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black gap-4 p-8">
                <h1 className="text-2xl font-bold">Invoice Not Found</h1>
                <p className="text-gray-500">The requested invoice ID {id} does not exist or you do not have permission to view it.</p>
                <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        // Convert Firestore Timestamp to Date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:bg-white print:p-0">
            {/* Action Bar (Hidden in Print) */}
            <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center print:hidden no-print">
                <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-black">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fees
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Printer className="w-4 h-4 mr-2" /> Print Invoice
                    </Button>
                </div>
            </div>

            {/* Invoice Paper */}
            <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none">
                {/* Header */}
                <div className="bg-blue-900 text-white p-8 print:bg-white print:text-black print:border-b-2 print:border-black">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold font-display tracking-tight">INVOICE</h1>
                            <p className="opacity-80 mt-1 text-sm font-mono tracking-wider">#{transaction.transactionId}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold">Spoorthy Concept School</h2>
                            <p className="text-sm opacity-80 mt-1">
                                Survey No. 123, Edu City<br />
                                Ongole, Andhra Pradesh - 523001<br />
                                Phone: +91 98765 43210
                            </p>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="p-8 border-b border-gray-100 print:border-gray-300">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Billed To</h3>
                            <div className="font-semibold text-lg">{transaction.studentName}</div>
                            <div className="text-sm text-gray-500">
                                Student ID: {transaction.studentId}<br />
                                Class: {transaction.className || "N/A"}<br />
                                {transaction.parentName && `Parent: ${transaction.parentName}`}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="space-y-1">
                                <div className="flex justify-end gap-4">
                                    <span className="text-gray-500 text-sm">Date Issued:</span>
                                    <span className="font-semibold text-sm">{formatDate(transaction.date)}</span>
                                </div>
                                <div className="flex justify-end gap-4">
                                    <span className="text-gray-500 text-sm">Payment Method:</span>
                                    <span className="font-semibold text-sm uppercase">{transaction.method}</span>
                                </div>
                                <div className="flex justify-end gap-4">
                                    <span className="text-gray-500 text-sm">Status:</span>
                                    <span className="font-bold text-sm text-green-600 uppercase tracking-wide">{transaction.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="p-8 min-h-[300px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <th className="pb-3 pl-2">Description</th>
                                <th className="pb-3 text-right pr-2">Amount Paid</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {(!transaction.itemsPaid || transaction.itemsPaid.length === 0) ? (
                                <tr>
                                    <td colSpan={2} className="py-4 text-center text-gray-500 italic">
                                        Consolidated Payment
                                    </td>
                                </tr>
                            ) : (
                                transaction.itemsPaid.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-gray-50 last:border-0">
                                        <td className="py-4 pl-2 font-medium text-gray-700">
                                            {item.itemName || item.name || "Fee Payment"}
                                            {item.itemId && <div className="text-xs text-gray-400 font-mono mt-0.5">{item.itemId}</div>}
                                        </td>
                                        <td className="py-4 text-right pr-2 font-mono">
                                            ₹ {Number(item.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Total */}
                <div className="bg-gray-50 p-8 print:bg-white print:border-t print:border-black">
                    <div className="flex justify-end items-center gap-6">
                        <div className="text-gray-500 font-medium">Total Amount Paid</div>
                        <div className="text-3xl font-bold text-blue-900 print:text-black font-mono">
                            ₹ {Number(transaction.amount).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 text-center text-xs text-gray-400 border-t border-gray-100 print:border-0">
                    <p>This is a computer-generated invoice and does not require a signature.</p>
                    <p className="mt-1">Thank you for being part of the Spoorthy Family.</p>
                </div>
            </div>

            <style jsx global>{printStyles}</style>
        </div>
    );
}

// Add simple print styles
const printStyles = `
@media print {
    @page { margin: 0; }
    body { background: white; }
    .no-print { display: none !important; }
}
`;
