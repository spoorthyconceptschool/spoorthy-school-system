"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { useMasterData } from "@/context/MasterDataContext";

interface StudentImportModalProps {
    onSuccess: () => void;
}

export function StudentImportModal({ onSuccess }: StudentImportModalProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<{ success: number, failed: number, errors: string[] } | null>(null);
    const { classes } = useMasterData();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            setParsedData(data);
            setResults(null);
        };
        reader.readAsBinaryString(selectedFile);
    };

    const handleUpload = async () => {
        if (!parsedData.length) return;
        setUploading(true);
        setResults(null);

        try {
            // Validate against Master Data (Classes)
            // Optional: Filter out invalid classes or just warn?
            // The API handles validation too.

            const res = await fetch("/api/admin/students/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ students: parsedData })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");

            setResults(data);
            if (data.success > 0) {
                onSuccess();
            }
        } catch (e: any) {
            console.error(e);
            alert("Upload Error: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        // Direct link to the pre-generated static template for 100% reliable download
        const a = document.createElement("a");
        a.href = "/templates/student_import.xlsx";
        a.download = "StudentImportTemplate.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setFile(null); setParsedData([]); setResults(null); } }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Import
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-white/10 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import Students via Excel/CSV</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Step 1: Template */}
                    <div className="bg-white/5 p-4 rounded-lg flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                            <p className="font-bold text-white mb-1">Step 1: Download Template</p>
                            <p>Use our template ensuring columns match exactly.</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-blue-400 hover:bg-blue-400/10 cursor-pointer">
                            <a href="/templates/student_import.xlsx" download="StudentImportTemplate.xlsx">
                                <Download className="w-4 h-4 mr-2" /> Template.xlsx
                            </a>
                        </Button>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="space-y-2">
                        <div className="font-bold text-sm text-gray-400">Step 2: Upload File</div>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:bg-white/5 transition-colors relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                <Upload className="w-8 h-8 opacity-90" />
                                <p>{file ? file.name : "Click to browse or drag file here"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Preview & Actions */}
                    {parsedData.length > 0 && !results && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Ready to import {parsedData.length} students.
                            </div>
                            <Button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {uploading ? <Loader2 className="animate-spin mr-2" /> : "Start Import"}
                            </Button>
                        </div>
                    )}

                    {/* Results */}
                    {results && (
                        <div className="bg-black/30 p-4 rounded-lg border border-white/10 space-y-2 animate-in fade-in">
                            <h4 className="font-bold mb-2">Import Results</h4>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-emerald-500/10 p-2 rounded border border-emerald-500/20 text-emerald-400">
                                    <div className="text-xl font-bold">{results.success}</div>
                                    <div className="text-xs uppercase">Success</div>
                                </div>
                                <div className="bg-red-500/10 p-2 rounded border border-red-500/20 text-red-400">
                                    <div className="text-xl font-bold">{results.failed}</div>
                                    <div className="text-xs uppercase">Failed</div>
                                </div>
                            </div>
                            {results.errors.length > 0 && (
                                <div className="mt-4 max-h-32 overflow-y-auto text-xs text-red-300 space-y-1 bg-black/20 p-2 rounded">
                                    {results.errors.map((err, i) => <div key={i}>• {err}</div>)}
                                </div>
                            )}
                            <Button variant="outline" onClick={() => { setFile(null); setParsedData([]); setResults(null); setOpen(false); }} className="w-full mt-4">
                                Done
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
