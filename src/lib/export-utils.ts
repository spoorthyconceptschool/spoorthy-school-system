import * as XLSX from "xlsx";

interface FeeItem {
    name: string;
    amount: number;
    type: "TERM" | "CUSTOM";
    isPaid?: boolean;
}

interface ExportStudentFeeProps {
    studentName: string;
    schoolId: string;
    className: string;
    items: FeeItem[];
    totalPaid: number;
    schoolLogo?: string;
    schoolName?: string;
    schoolAddress?: string;
    principalSignature?: string;
}

export const exportSingleStudentFee = ({ studentName, schoolId, className, items, totalPaid }: ExportStudentFeeProps) => {
    try {
        const totalFee = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const balance = totalFee - totalPaid;

        const data = [
            ["STUDENT FEE STRUCTURE REPORT"],
            ["Generated on:", new Date().toLocaleDateString()],
            [],
            ["Student Name:", studentName],
            ["Student ID:", schoolId],
            ["Class:", className],
            [],
            ["Fee Name", "Amount", "Type", "Status"],
            ...items.map(item => [
                item.name,
                item.amount,
                item.type,
                (item.amount <= (totalPaid / items.length)) ? "PAID (Estimate)" : "PENDING" // This is just a visual status
            ]),
            [],
            ["Summary", ""],
            ["Total Assigned Fee", totalFee],
            ["Total Amount Paid", totalPaid],
            ["Balance Due", balance]
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fee_Structure");

        // Set column widths
        ws["!cols"] = [
            { wch: 30 }, // Fee Name
            { wch: 15 }, // Amount
            { wch: 15 }, // Type
            { wch: 15 }, // Status
        ];

        XLSX.writeFile(wb, `${studentName}_Fee_Structure_${schoolId}.xlsx`);
    } catch (error) {
        console.error("Export failed", error);
        alert("Failed to export fee structure");
    }
};

export const printStudentFeeStructure = ({ studentName, schoolId, className, items, totalPaid, schoolLogo, schoolName, schoolAddress, principalSignature }: ExportStudentFeeProps) => {
    const totalFee = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const balance = totalFee - totalPaid;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    const html = `
        <html>
        <head>
            <title>Fee Structure - ${studentName}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20mm; color: #333; line-height: 1.5; }
                .header { display: flex; align-items: center; justify-content: center; gap: 30px; border-bottom: 2px solid #333; padding-bottom: 5mm; margin-bottom: 10mm; }
                .logo { height: 80px; width: auto; object-fit: contain; }
                .header-text { text-align: left; }
                .school-name { font-size: 28px; font-weight: bold; text-transform: uppercase; color: #1a1a1a; margin-bottom: 2px; }
                .sub-header { font-size: 14px; color: #666; font-style: italic; }
                .doc-title { font-size: 20px; font-weight: 800; margin-top: 8mm; text-decoration: underline; letter-spacing: 1px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-bottom: 12mm; background: #fcfcfc; padding: 5mm; border: 1px solid #eee; }
                .info-item { display: flex; gap: 3mm; border-bottom: 1px dashed #eee; padding-bottom: 1mm; }
                .label { font-weight: bold; color: #555; width: 120px; flex-shrink: 0; }
                .value { font-weight: 600; color: #000; }

                table { width: 100%; border-collapse: collapse; margin-bottom: 12mm; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
                th, td { border: 1px solid #ccc; padding: 4mm; text-align: left; }
                th { background-color: #f1f1f1; font-weight: bold; text-transform: uppercase; font-size: 12px; }
                .total-row { font-weight: bold; background-color: #f9f9f9; }
                
                .summary-box { margin-left: auto; width: 300px; border: 2px solid #333; padding: 5mm; border-radius: 1mm; background: #fff; }
                .summary-item { display: flex; justify-content: space-between; margin-bottom: 3mm; font-size: 14px; }
                .summary-item.grand { border-top: 2px solid #333; padding-top: 3mm; margin-top: 2mm; font-size: 18px; }
                
                .footer { margin-top: 30mm; display: flex; justify-content: space-between; }
                .sig-box { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 3mm; font-size: 13px; font-weight: bold; }
                
                .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; opacity: 0.03; z-index: -1; pointer-events: none; }
                
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                    .summary-box { border-color: #000; }
                }
            </style>
        </head>
        <body>
            <div class="watermark">${schoolName?.toUpperCase() || 'SPOORTHY SCHOOL'}</div>
            
            <div class="header">
                ${schoolLogo ? `<img src="${schoolLogo}" class="logo" />` : ''}
                <div class="header-text">
                    <div class="school-name">${schoolName || 'Spoorthy Concept School'}</div>
                    <div class="sub-header">${schoolAddress || 'Excellence in Education | Quality | Innovation'}</div>
                    <div class="doc-title">OFFICIAL FEE STRUCTURE RECEIPT</div>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-item"><span class="label">Student Name:</span> <span class="value">${studentName}</span></div>
                <div class="info-item"><span class="label">Student ID:</span> <span class="value">${schoolId}</span></div>
                <div class="info-item"><span class="label">Class:</span> <span class="value">${className}</span></div>
                <div class="info-item"><span class="label">Academic Year:</span> <span class="value">2025 - 2026</span></div>
                <div class="info-item"><span class="label">Print Date:</span> <span class="value">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
                <div class="info-item"><span class="label">Generated By:</span> <span class="value">Admin System</span></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 60%;">Description of Particulars</th>
                        <th style="width: 15%;">Type</th>
                        <th style="width: 25%; text-align: right;">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.type}</td>
                            <td style="text-align: right; font-family: monospace;">₹${item.amount.toLocaleString('en-IN')}.00</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="2" style="text-align: right;">AGGREGATE FEE AMOUNT:</td>
                        <td style="text-align: right; font-family: monospace;">₹${totalFee.toLocaleString('en-IN')}.00</td>
                    </tr>
                </tbody>
            </table>

            <div class="summary-box">
                <div class="summary-item">
                    <span>Total Allocated Fee:</span>
                    <span style="font-family: monospace;">₹${totalFee.toLocaleString('en-IN')}</span>
                </div>
                <div class="summary-item">
                    <span>Amount Received:</span>
                    <span style="font-family: monospace; color: #2e7d32;">- ₹${totalPaid.toLocaleString('en-IN')}</span>
                </div>
                <div class="summary-item grand">
                    <span style="font-weight: 800;">Balance Due:</span>
                    <span style="font-weight: 800; color: #c62828; font-family: monospace;">₹${balance.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div style="margin-top: 10mm; font-size: 11px; color: #666; border-left: 3px solid #ccc; padding-left: 4mm;">
                <p><strong>Note:</strong> This is a system-generated document and reflects the current fee commitments for the academic year 2025-26. Please retain this for your records.</p>
            </div>

            <div class="footer">
                <div class="sig-box">Parent / Guardian Signature</div>
                <div class="sig-box">
                    ${principalSignature ? `<img src="${principalSignature}" style="height: 40px; margin-bottom: -5px;" /><br/>` : ''}
                    Authorized Signatory
                </div>
            </div>

            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};

export const printPendingFeeReport = ({ studentName, schoolId, className, items, totalPaid, schoolLogo, schoolName, schoolAddress, principalSignature }: ExportStudentFeeProps) => {
    const pendingItems = items.filter(item => item.amount > 0);
    const totalDue = pendingItems.reduce((sum, item) => sum + item.amount, 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    const html = `
        <html>
        <head>
            <title>Pending Dues - ${studentName}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 15mm; color: #333; }
                .header { display: flex; align-items: center; justify-content: center; gap: 20px; border-bottom: 2px solid #000; margin-bottom: 10mm; padding-bottom: 5mm; }
                .logo { height: 60px; width: auto; object-fit: contain; }
                .header-text { text-align: left; }
                .school-name { font-size: 24px; font-weight: bold; }
                .doc-title { font-size: 18px; margin-top: 2mm; font-weight: bold; background: #000; color: #fff; display: inline-block; padding: 1mm 4mm; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 10mm; }
                .info-item { border-bottom: 1px solid #eee; padding: 2mm 0; }
                .label { font-weight: bold; font-size: 12px; color: #666; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 5mm; }
                th, td { border: 1px solid #000; padding: 3mm; text-align: left; }
                th { background: #f0f0f0; }
                
                .total-box { margin-top: 10mm; text-align: right; border: 2px solid #000; padding: 5mm; width: fit-content; margin-left: auto; }
                .total-label { font-size: 14px; font-weight: bold; }
                .total-value { font-size: 24px; font-weight: 900; color: #c00; }
                
                .footer { margin-top: 25mm; display: flex; justify-content: space-between; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                ${schoolLogo ? `<img src="${schoolLogo}" class="logo" />` : ''}
                <div class="header-text">
                    <div class="school-name">${schoolName || 'Spoorthy Concept School'}</div>
                    <div class="sub-header">${schoolAddress || 'Excellence in Education | Quality | Innovation'}</div>
                    <div class="doc-title">PENDING FEE STATEMENT</div>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-item"><div class="label">STUDENT NAME</div><div>${studentName}</div></div>
                <div class="info-item"><div class="label">STUDENT ID</div><div>${schoolId}</div></div>
                <div class="info-item"><div class="label">CLASS</div><div>${className}</div></div>
                <div class="info-item"><div class="label">DATE</div><div>${new Date().toLocaleDateString()}</div></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Fee Description</th>
                        <th style="text-align: right;">Pending Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingItems.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td style="text-align: right;">₹${item.amount.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total-box">
                <div class="total-label">TOTAL OUTSTANDING AMOUNT</div>
                <div class="total-value">₹${totalDue.toLocaleString()}</div>
            </div>

            <p style="margin-top: 10mm; font-size: 12px; font-style: italic;">Note: This statement only lists the unpaid and partially paid fee components.</p>

            <div class="footer" style="margin-top: 25mm; display: flex; justify-content: space-between; font-weight: bold;">
                <div style="text-align: center; width: 150px; border-top: 1px solid #999; padding-top: 10px;">Accountant / Office</div>
                <div style="text-align: center; width: 150px; border-top: 1px solid #999; padding-top: 10px;">
                    ${principalSignature ? `<img src="${principalSignature}" style="height: 40px; margin-bottom: -5px;" /><br/>` : ''}
                    Principal Signature
                </div>
            </div>

            <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};

export const exportAcademicLoad = (data: any[]) => {
    try {
        const rows = [
            ["ACADEMIC LOAD & TEACHER ASSIGNMENT REPORT"],
            ["Generated on:", new Date().toLocaleDateString()],
            [],
            ["Class", "Section", "Class Teacher", "Subject", "Assigned Teacher"]
        ];

        data.forEach(item => {
            if (item.subjects.length === 0) {
                rows.push([item.className, item.sectionName, item.classTeacher || "N/A", "No Subjects Assigned", "-"]);
            } else {
                item.subjects.forEach((sub: any, index: number) => {
                    rows.push([
                        index === 0 ? item.className : "",
                        index === 0 ? item.sectionName : "",
                        index === 0 ? (item.classTeacher || "N/A") : "",
                        sub.name,
                        sub.teacher || "N/A"
                    ]);
                });
            }
            rows.push([]); // Small divider row
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Academic_Load");

        ws["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];

        XLSX.writeFile(wb, `Academic_Load_Report_${new Date().getTime()}.xlsx`);
    } catch (error) {
        console.error(error);
        alert("Failed to export academic load report");
    }
};
// ... existing code ...

export const printPaymentReceipt = ({
    payment,
    student,
    ledger,
    schoolLogo,
    schoolName,
    schoolAddress,
    principalSignature
}: {
    payment: any;
    student: any;
    ledger: any;
    schoolLogo?: string;
    schoolName?: string;
    schoolAddress?: string;
    principalSignature?: string;
}) => {
    const totalFee = ledger?.totalFee || 0;
    const totalPaid = ledger?.totalPaid || 0;
    const balance = totalFee - totalPaid;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    const html = `
        <html>
        <head>
            <title>Payment Receipt - ${payment.id}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 10mm; color: #333; line-height: 1.5; }
                .header { display: flex; align-items: center; justify-content: center; gap: 20px; border-bottom: 2px solid #333; padding-bottom: 5mm; margin-bottom: 8mm; }
                .logo { height: 60px; width: auto; object-fit: contain; }
                .header-text { text-align: left; }
                .school-name { font-size: 24px; font-weight: bold; text-transform: uppercase; color: #1a1a1a; margin-bottom: 2px; }
                .sub-header { font-size: 12px; color: #666; }
                .doc-title { font-size: 18px; font-weight: 800; margin-top: 3mm; text-decoration: underline; letter-spacing: 1px; }
                
                .receipt-meta { display: flex; justify-content: space-between; margin-bottom: 8mm; border-bottom: 1px dashed #ccc; padding-bottom: 4mm; }
                .meta-item { font-size: 14px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 8mm; background: #f9f9f9; padding: 4mm; border: 1px solid #eee; }
                .info-item { display: flex; flex-direction: column; }
                .label { font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; }
                .value { font-size: 14px; font-weight: 600; color: #000; }

                .amount-box { text-align: center; margin: 10mm 0; border: 2px solid #333; padding: 6mm; border-radius: 2mm; background: #fff; }
                .amount-label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                .amount-value { font-size: 32px; font-weight: 800; color: #2e7d32; font-family: monospace; margin-top: 2mm; }
                .amount-words { font-size: 12px; font-style: italic; color: #666; margin-top: 2mm; }

                .ledger-summary { margin-top: 10mm; border-top: 1px solid #ccc; pt: 4mm; }
                .summary-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .summary-table td { padding: 2mm; border-bottom: 1px solid #eee; }
                .summary-table .amount { font-family: monospace; font-weight: bold; text-align: right; }

                .footer { margin-top: 20mm; display: flex; justify-content: space-between; font-size: 12px; }
                .sig-box { border-top: 1px solid #999; width: 150px; text-align: center; padding-top: 2mm; }
                
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                ${schoolLogo ? `<img src="${schoolLogo}" class="logo" />` : ''}
                <div class="header-text">
                    <div class="school-name">${schoolName || 'Spoorthy Concept School'}</div>
                    <div class="sub-header">${schoolAddress || 'Survey No. 123, Edu City, Ongole, AP - 523001'}</div>
                    <div class="doc-title">PAYMENT RECEIPT</div>
                </div>
            </div>

            <div class="receipt-meta">
                <div class="meta-item"><strong>Receipt No:</strong> #${payment.id.slice(0, 8).toUpperCase()}</div>
                <div class="meta-item"><strong>Date:</strong> ${payment.date?.toDate ? payment.date.toDate().toLocaleDateString() : new Date(payment.date).toLocaleDateString()}</div>
            </div>

            <div class="info-grid">
                <div class="info-item"><span class="label">Student Name</span> <span class="value">${student.studentName}</span></div>
                <div class="info-item"><span class="label">Student ID</span> <span class="value">${student.schoolId}</span></div>
                <div class="info-item"><span class="label">Class</span> <span class="value">${student.className}</span></div>
                <div class="info-item"><span class="label">Payment Mode</span> <span class="value" style="text-transform: capitalize;">${payment.method}</span></div>
                <div class="info-item"><span class="label">Remarks</span> <span class="value">${payment.remarks || "-"}</span></div>
            </div>

            <div class="amount-box">
                <div class="amount-label">Amount Received</div>
                <div class="amount-value">₹${Number(payment.amount).toLocaleString('en-IN')}</div>
            </div>

            <div class="ledger-summary">
                <h4 style="margin: 0 0 4mm 0; font-size: 14px; text-transform: uppercase; border-bottom: 2px solid #eee; padding-bottom: 2mm;">Account Summary</h4>
                <table class="summary-table">
                    <tr>
                        <td>Total Academic Fee</td>
                        <td class="amount">₹${totalFee.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td>Total Paid (Cumulative)</td>
                        <td class="amount" style="color: #2e7d32;">- ₹${totalPaid.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style="background: #fff0f0;">
                        <td style="font-weight: bold; color: #c62828;">Balance Due</td>
                        <td class="amount" style="color: #c62828;">₹${balance.toLocaleString('en-IN')}</td>
                    </tr>
                </table>
            </div>

            <div class="footer">
                <div class="sig-box">Depositor Signature</div>
                <div class="sig-box">
                    ${principalSignature ? `<img src="${principalSignature}" style="height: 40px; margin-bottom: -5px;" /><br/>` : ''}
                    Cashier / Authorized Signatory
                </div>
            </div>

            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
