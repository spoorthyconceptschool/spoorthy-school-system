module.exports=[82149,a=>{"use strict";var b=a.i(87924),c=a.i(72131);a.i(69387);var d=a.i(60574),e=a.i(20237),f=a.i(91410),g=a.i(99570),h=a.i(91119),i=a.i(14574),j=a.i(66718),k=a.i(70430),l=a.i(80701),m=a.i(75083),n=a.i(86304),o=a.i(96221),p=a.i(14548),q=a.i(71931),r=a.i(210),s=a.i(41675),t=a.i(41710),u=a.i(4720),v=a.i(16201),w=a.i(92e3);function x({exam:a,classId:h}){let[j,k]=(0,c.useState)(!1),[l,m]=(0,c.useState)(!1),[n,p]=(0,c.useState)(null),{subjects:r,classes:s}=(0,f.useMasterData)(),[t,x]=(0,c.useState)([]),[y,z]=(0,c.useState)({});(0,c.useEffect)(()=>{j&&(A(),B())},[j,h,a.id]);let A=async()=>{let a=await (0,d.getDoc)((0,d.doc)(e.db,"settings","branding"));a.exists()&&p(a.data())},B=async()=>{if(h){m(!0);try{let b=(0,d.query)((0,d.collection)(e.db,"students"),(0,d.where)("classId","==",h),(0,d.where)("status","==","ACTIVE")),c=(await (0,d.getDocs)(b)).docs.map(a=>({id:a.id,...a.data()}));c.sort((a,b)=>{let c=parseInt(a.rollNo)||999,d=parseInt(b.rollNo)||999;return c-d||a.studentName.localeCompare(b.studentName)}),x(c);let f=(0,d.query)((0,d.collection)(e.db,"exam_results"),(0,d.where)("examId","==",a.id),(0,d.where)("classId","==",h)),g=await (0,d.getDocs)(f),i={};g.docs.forEach(a=>{i[a.data().studentId]=a.data()}),z(i)}catch(a){console.error(a)}finally{m(!1)}}},C=t.filter(a=>y[a.id]).length;return(0,b.jsxs)(i.Dialog,{open:j,onOpenChange:k,children:[(0,b.jsx)(i.DialogTrigger,{asChild:!0,children:(0,b.jsxs)(g.Button,{variant:"outline",className:"gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",children:[(0,b.jsx)(u.FileText,{className:"w-4 h-4"})," Report Cards"]})}),(0,b.jsxs)(i.DialogContent,{className:"bg-black/95 border-white/10 text-white w-[95vw] sm:max-w-md",children:[(0,b.jsx)(i.DialogHeader,{children:(0,b.jsx)(i.DialogTitle,{children:"Generate Report Cards"})}),(0,b.jsxs)("div",{className:"py-4 space-y-4",children:[(0,b.jsx)("p",{className:"text-sm text-muted-foreground",children:"This will generate formal report cards for the selected class."}),l?(0,b.jsxs)("div",{className:"flex flex-col items-center py-8",children:[(0,b.jsx)(o.Loader2,{className:"w-8 h-8 animate-spin text-emerald-500 mb-2"}),(0,b.jsx)("p",{className:"text-xs",children:"Preparing Student Records..."})]}):(0,b.jsxs)(b.Fragment,{children:[(0,b.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,b.jsxs)("div",{className:"p-3 bg-white/5 border border-white/10 rounded-lg",children:[(0,b.jsx)("p",{className:"text-[10px] text-muted-foreground uppercase",children:"Class Strength"}),(0,b.jsx)("p",{className:"text-xl font-bold",children:t.length})]}),(0,b.jsxs)("div",{className:"p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg",children:[(0,b.jsx)("p",{className:"text-[10px] text-emerald-400 uppercase",children:"Results Ready"}),(0,b.jsx)("p",{className:"text-xl font-bold text-emerald-400",children:C})]})]}),0===C?(0,b.jsxs)("div",{className:"p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 text-red-400",children:[(0,b.jsx)(w.AlertCircle,{className:"w-5 h-5 shrink-0"}),(0,b.jsx)("p",{className:"text-xs",children:"No marks have been entered for this class yet. Teachers must enter marks before report cards can be generated."})]}):(0,b.jsxs)("div",{className:"p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 text-blue-400",children:[(0,b.jsx)(v.CheckCircle,{className:"w-5 h-5 shrink-0"}),(0,b.jsxs)("p",{className:"text-xs",children:["Ready to print ",C," report cards. Each student will get a full A4 page with breakdown of marks, total, percentage, and principal's signature."]})]}),(0,b.jsxs)(g.Button,{onClick:()=>{let b=window.open("","_blank");if(!b)return;let c=`
            <html>
            <head>
                <title>Report Cards - Academic Transcript</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { 
                        font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; 
                        margin: 0; 
                        padding: 0; 
                        background: #f8fafc; 
                        color: #1e293b;
                    }
                    .report-card { 
                        width: 210mm;
                        max-height: 297mm;
                        padding: 12mm;
                        box-sizing: border-box;
                        page-break-after: always;
                        position: relative;
                        background: #fff;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }
                    
                    /* Institutional Border */
                    .document-border {
                        position: absolute;
                        top: 5mm;
                        left: 5mm;
                        right: 5mm;
                        bottom: 5mm;
                        border: 2.5pt double #1e40af;
                        pointer-events: none;
                        z-index: 10;
                    }

                    /* Header Section */
                    .header { 
                        border-bottom: 2pt solid #1e40af; 
                        padding-bottom: 5mm; 
                        margin-bottom: 8mm; 
                        display: flex;
                        align-items: center;
                        gap: 10mm;
                    }
                    .logo { height: 90px; width: auto; object-fit: contain; }
                    .header-content { flex: 1; }
                    .school-name { 
                        font-size: 24pt; 
                        font-weight: 900; 
                        text-transform: uppercase; 
                        color: #1e3a8a; 
                        margin: 0;
                        letter-spacing: -1px;
                    }
                    .sub-header { 
                        font-size: 10pt; 
                        font-weight: 700; 
                        color: #64748b; 
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .document-title { 
                        margin-top: 4mm;
                        display: inline-block;
                        background: #1e40af;
                        color: #fff;
                        padding: 2mm 10mm;
                        border-radius: 4px;
                        font-weight: 800;
                        text-transform: uppercase;
                        font-size: 11pt;
                        letter-spacing: 2px;
                    }

                    /* Profile Grid */
                    .profile-grid { 
                        display: grid; 
                        grid-template-columns: 1.5fr 1fr; 
                        gap: 8mm; 
                        margin-bottom: 8mm;
                    }
                    .section-label { 
                        font-size: 8pt; 
                        font-weight: 800; 
                        text-transform: uppercase; 
                        color: #1e40af;
                        margin-bottom: 2mm;
                        display: block;
                    }
                    .data-card { 
                        background: #f1f5f9;
                        border: 1pt solid #e2e8f0;
                        padding: 5mm;
                        border-radius: 6px;
                    }
                    .data-row { display: flex; margin-bottom: 2mm; border-bottom: 0.5pt solid #ddd; padding-bottom: 1mm; }
                    .data-row:last-child { border: none; margin: 0; padding: 0; }
                    .label { width: 35mm; font-size: 8.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; }
                    .value { font-size: 11pt; font-weight: 900; color: #0f172a; flex: 1; }

                    /* Marks Table */
                    .marks-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 8mm;
                        border: 1pt solid #1e40af;
                    }
                    .marks-table th { 
                        background: #1e40af;
                        color: #fff;
                        border: 1pt solid #1e40af;
                        padding: 4mm 3mm;
                        text-align: left;
                        font-size: 9pt;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .marks-table td { 
                        border: 1pt solid #e2e8f0;
                        padding: 4mm 3mm;
                        font-size: 11pt;
                        font-weight: 500;
                    }
                    .marks-table tr:nth-child(even) { background: #f8fafc; }
                    .col-center { text-align: center; }
                    .col-marks { font-weight: 900; font-size: 14pt; color: #1e3a8a; }

                    /* Summary Boxes */
                    .summary-grid { 
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 5mm;
                        margin-bottom: 8mm;
                    }
                    .summary-card { 
                        background: #fff;
                        border: 1.5pt solid #1e40af;
                        padding: 5mm;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }
                    .summary-card::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0; height: 3pt;
                        background: #1e40af;
                    }
                    .sum-label { font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 1mm; display: block; }
                    .sum-value { font-size: 20pt; font-weight: 900; color: #0f172a; }

                    /* Remarks */
                    .remarks-box { 
                        padding: 5mm; 
                        background: #ecf2ff; 
                        border: 1pt solid #1e40af33; 
                        border-radius: 6px;
                        margin-bottom: 15mm;
                    }
                    .remarks-title { font-size: 8pt; font-weight: 900; text-transform: uppercase; color: #1e40af; margin-bottom: 2mm; display: block; }
                    .remarks-text { font-size: 11pt; font-weight: 500; color: #334155; line-height: 1.5; font-style: italic; }

                    /* Signatures */
                    .footer { 
                        margin-top: auto; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-end;
                        padding: 0 5mm 5mm 5mm;
                    }
                    .signature { 
                        text-align: center;
                        width: 50mm;
                    }
                    .sign-line { 
                        border-top: 1.2pt solid #0f172a; 
                        margin-top: 3mm; 
                        padding-top: 1.5mm; 
                        font-weight: 800; 
                        font-size: 9pt; 
                        text-transform: uppercase; 
                        color: #0f172a;
                    }
                    .sign-stamp { height: 55px; margin-bottom: -15px; display: block; margin-left: auto; margin-right: auto; }

                    .watermark {
                        position: absolute;
                        top: 55%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 140mm;
                        opacity: 0.035;
                        z-index: 0;
                        pointer-events: none;
                    }
                    .watermark img { width: 100%; filter: grayscale(1); }
                </style>
            </head>
            <body>
                ${t.map(b=>{let c=y[b.id];if(!c)return"";let d=Object.entries(c.subjects||{}),e=0,f=0;d.forEach(([a,b])=>{let c=parseFloat(b.obtained),d=parseFloat(b.maxMarks);isNaN(c)||(e+=c),isNaN(d)||(f+=d)});let g=f>0?e/f*100:0,h=g>=90?"A+":g>=80?"A":g>=70?"B+":g>=60?"B":g>=50?"C":g>=35?"D":"E (Fail)";return`
                        <div class="report-card">
                            <div class="document-border"></div>
                            <div class="watermark">
                                ${n?.schoolLogo?`<img src="${n.schoolLogo}" />`:""}
                            </div>

                            <div class="header">
                                ${n?.schoolLogo?`<img src="${n.schoolLogo}" class="logo" />`:""}
                                <div class="header-content">
                                    <h1 class="school-name">${n?.schoolName||"Spoorthy Concept School"}</h1>
                                    <div class="sub-header">Official Academic Record - Recognized by Govt. of Telangana</div>
                                    <div class="document-title">Scholastic Performance Report</div>
                                </div>
                            </div>

                            <div class="profile-grid">
                                <div>
                                    <span class="section-label">Student Identification</span>
                                    <div class="data-card">
                                        <div class="data-row"><span class="label">Legal Name</span> <span class="value">${b.studentName.toUpperCase()}</span></div>
                                        <div class="data-row"><span class="label">Enrollment ID</span> <span class="value">${b.schoolId}</span></div>
                                        <div class="data-row"><span class="label">Class/Section</span> <span class="value">${b.className} – ${b.sectionName||"A"}</span></div>
                                        <div class="data-row"><span class="label">Roll Number</span> <span class="value">${b.rollNo||"N/A"}</span></div>
                                    </div>
                                </div>
                                <div>
                                    <span class="section-label">Academic Detail</span>
                                    <div class="data-card">
                                        <div class="data-row"><span class="label">Examination</span> <span class="value">${a.name}</span></div>
                                        <div class="data-row"><span class="label">Session</span> <span class="value">2025-2026</span></div>
                                        <div class="data-row"><span class="label">Issue Date</span> <span class="value">${new Date().toLocaleDateString()}</span></div>
                                    </div>
                                </div>
                            </div>

                            <table class="marks-table">
                                <thead>
                                    <tr>
                                        <th style="width: 40%">Subject Particulars</th>
                                        <th class="col-center">Max Marks</th>
                                        <th class="col-center">Obtained</th>
                                        <th>Academic Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${d.map(([a,b])=>`
                                        <tr>
                                            <td style="font-weight: 800; color: #1e3a8a;">${r[a]?.name||a}</td>
                                            <td class="col-center" style="color: #64748b;">${b.maxMarks}</td>
                                            <td class="col-center col-marks">${b.obtained}</td>
                                            <td style="font-size: 9pt; color: #475569;">${b.remarks||"Satisfactory"}</td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>

                            <div class="summary-grid">
                                <div class="summary-card">
                                    <span class="sum-label">Aggregate Score</span>
                                    <span class="sum-value">${e} <small style="font-size: 10pt; color: #94a3b8;">/ ${f}</small></span>
                                </div>
                                <div class="summary-card">
                                    <span class="sum-label">Percentage</span>
                                    <span class="sum-value">${g.toFixed(1)}%</span>
                                </div>
                                <div class="summary-card">
                                    <span class="sum-label">Scholastic Grade</span>
                                    <span class="sum-value" style="color: #1e40af;">${h}</span>
                                </div>
                            </div>

                            <div class="remarks-box">
                                <span class="remarks-title">Institutional Feedback</span>
                                <p class="remarks-text">
                                    ${g>85?"Exceptional academic proficiency demonstrated. Continues to be an exemplary student.":g>70?"Commendable performance. Shows strong potential for further academic growth.":g>50?"Consistent effort is recommended in core subjects to achieve higher proficiency.":"Focused remedial attention in specific areas required for academic advancement."}
                                </p>
                            </div>

                            <div class="footer">
                                <div class="signature">
                                    <div class="sign-line">Class Teacher</div>
                                </div>
                                <div class="signature">
                                    <div class="sign-line">Parent Signature</div>
                                </div>
                                <div class="signature">
                                    ${n?.principalSignature?`<img src="${n.principalSignature}" class="sign-stamp" />`:""}
                                    <div class="sign-line">Principal</div>
                                </div>
                            </div>
                        </div>
                    `}).join("")}
                <script>
                    window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
                </script>
            </body>
            </html>
        `;b.document.write(c),b.document.close(),k(!1)},disabled:0===C,className:"w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 gap-2 font-bold",children:[(0,b.jsx)(q.Printer,{className:"w-5 h-5"})," Print ",C," Report Cards"]})]})]})]})]})}var y=a.i(68114),z=a.i(50944);function A({params:a}){let{id:v}=(0,c.use)(a),w=(0,z.useRouter)(),{classes:A,subjects:B}=(0,f.useMasterData)(),[C,D]=(0,c.useState)(null),[E,F]=(0,c.useState)(!0),[G,H]=(0,c.useState)(!1),[I,J]=(0,c.useState)(""),[K,L]=(0,c.useState)({}),M=Object.values(A).map(a=>({id:a.id,name:a.name,order:a.order||99})).sort((a,b)=>a.order-b.order),N=Object.values(B).filter(a=>!1!==a.isActive).sort((a,b)=>a.name.localeCompare(b.name)),O=async()=>{try{let a=await (0,d.getDoc)((0,d.doc)(e.db,"exams",v));a.exists()?D({id:a.id,...a.data()}):w.push("/admin/exams")}catch(a){console.error(a)}finally{F(!1)}};(0,c.useEffect)(()=>{O()},[v]),(0,c.useEffect)(()=>{if(I&&C){let a=C.timetables?.[I]||{},b={};N.forEach(c=>{a[c.id]?b[c.id]={...a[c.id],enabled:!0}:b[c.id]={date:"",startTime:"09:00",endTime:"12:00",enabled:!1}}),L(b)}},[I,C]);let P=async()=>{if(!I||!C)return void console.error("Missing selectedClassId or exam data",{selectedClassId:I,exam:C});H(!0),console.log("Saving timetable for class:",I);try{let a={};Object.entries(K).forEach(([b,c])=>{c.enabled&&c.date&&(a[b]={date:c.date,startTime:c.startTime||"09:00",endTime:c.endTime||"12:00"})}),console.log("Cleaned timetable data:",a);let{id:b,...c}=C,f={...c.timetables||{},[I]:a};await (0,d.setDoc)((0,d.doc)(e.db,"exams",v),{...c,timetables:f}),D({id:v,...c,timetables:f}),alert(`Timetable for ${A[I]?.name||"Class"} Saved Successfully!`)}catch(a){console.error("Save Timetable Error:",a),alert("Failed to save: "+a.message)}finally{H(!1)}},Q=(a,b,c)=>{L(d=>({...d,[a]:{...d[a],[b]:c}}))},[R,S]=(0,c.useState)(!1),[T,U]=(0,c.useState)({name:"",startDate:"",endDate:"",examCenter:"SCS-HYD",academicYear:"2025-26",instructions:"Carry this Hall Ticket to the exam hall.\nReport 15 mins before time.\nNo electronic gadgets allowed."});(0,c.useEffect)(()=>{C&&U({name:C.name,startDate:C.startDate,endDate:C.endDate,examCenter:C.examCenter||"SCS-HYD",academicYear:C.academicYear||"2025-26",instructions:C.instructions||"Carry this Hall Ticket to the exam hall.\nReport 15 mins before time.\nNo electronic gadgets allowed."})},[C]);let V=async()=>{if(T.name&&T.startDate&&T.endDate){H(!0);try{await (0,d.setDoc)((0,d.doc)(e.db,"exams",v),{...C,...T},{merge:!0}),D({...C,...T}),S(!1),alert("Exam Details Updated")}catch(a){console.error(a),alert("Error: "+a.message)}finally{H(!1)}}};return E?(0,b.jsx)("div",{className:"flex justify-center p-20",children:(0,b.jsx)(o.Loader2,{className:"animate-spin"})}):C?(0,b.jsxs)("div",{className:"space-y-6 max-w-7xl mx-auto p-6 animate-in fade-in",children:[(0,b.jsxs)("div",{className:"flex items-center gap-4 mb-6",children:[(0,b.jsx)(g.Button,{variant:"ghost",size:"icon",onClick:()=>w.push("/admin/exams"),children:(0,b.jsx)(r.ArrowLeft,{className:"w-5 h-5"})}),(0,b.jsxs)("div",{className:"flex-1",children:[(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsx)("h1",{className:"text-3xl font-display font-bold",children:C.name}),(0,b.jsxs)("div",{className:"flex items-center gap-2",children:[(0,b.jsx)("span",{className:`px-2 py-0.5 rounded text-xs font-bold border ${"RESULTS_RELEASED"===C.status?"bg-emerald-500/10 border-emerald-500/20 text-emerald-400":"bg-blue-500/10 border-blue-500/20 text-blue-400"}`,children:"RESULTS_RELEASED"===C.status?"RESULTS PUBLISHED":C.status||"ACTIVE"}),(0,b.jsx)(g.Button,{size:"sm",variant:"outline",className:"h-6 text-xs bg-white/5 border-white/10",onClick:()=>S(!0),children:"Edit"})]})]}),(0,b.jsxs)("p",{className:"text-muted-foreground flex items-center gap-2",children:[(0,b.jsx)(s.Calendar,{className:"w-4 h-4"}),new Date(C.startDate).toLocaleDateString()," - ",new Date(C.endDate).toLocaleDateString()]})]}),(0,b.jsx)("div",{className:"flex gap-2",children:(0,b.jsx)(g.Button,{onClick:async()=>{if(!confirm("RESULTS_RELEASED"===C.status?"Hide results from students?":"Release results to students?"))return;let a="RESULTS_RELEASED"===C.status?"ACTIVE":"RESULTS_RELEASED";await (0,d.setDoc)((0,d.doc)(e.db,"exams",v),{status:a},{merge:!0}),D({...C,status:a})},className:"RESULTS_RELEASED"===C.status?"bg-yellow-600 hover:bg-yellow-700":"bg-emerald-600 hover:bg-emerald-700",children:"RESULTS_RELEASED"===C.status?"Unpublish Results":"Release Results"})})]}),(0,b.jsx)(i.Dialog,{open:R,onOpenChange:S,children:(0,b.jsxs)(i.DialogContent,{className:"bg-black/95 border-white/10 text-white",children:[(0,b.jsx)(i.DialogHeader,{children:(0,b.jsx)(i.DialogTitle,{children:"Edit Exam Details"})}),(0,b.jsxs)("div",{className:"space-y-4 py-4",children:[(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(k.Label,{children:"Exam Name"}),(0,b.jsx)(j.Input,{className:"bg-white/5 border-white/10",value:T.name,onChange:a=>U({...T,name:a.target.value})})]}),(0,b.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(k.Label,{children:"Academic Year"}),(0,b.jsx)(j.Input,{className:"bg-white/5 border-white/10",value:T.academicYear,onChange:a=>U({...T,academicYear:a.target.value}),placeholder:"e.g. 2025-26"})]}),(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(k.Label,{children:"Exam Center"}),(0,b.jsx)(j.Input,{className:"bg-white/5 border-white/10",value:T.examCenter,onChange:a=>U({...T,examCenter:a.target.value})})]})]}),(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(k.Label,{children:"Hall Ticket Instructions (one per line)"}),(0,b.jsx)("textarea",{className:"w-full min-h-[100px] rounded-md bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent",value:T.instructions,onChange:a=>U({...T,instructions:a.target.value})})]}),(0,b.jsx)(g.Button,{onClick:V,disabled:G,className:"w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4",children:G?(0,b.jsx)(o.Loader2,{className:"animate-spin"}):"Save Changes"})]})]})}),(0,b.jsxs)(m.Tabs,{defaultValue:"timetable",className:"space-y-6",children:[(0,b.jsxs)(m.TabsList,{className:"bg-black/20 border-white/10",children:[(0,b.jsxs)(m.TabsTrigger,{value:"timetable",children:[(0,b.jsx)(t.Clock,{className:"w-4 h-4 mr-2"})," Exam Timetable"]}),(0,b.jsxs)(m.TabsTrigger,{value:"documents",children:[(0,b.jsx)(u.FileText,{className:"w-4 h-4 mr-2"})," Documents (Tickets/Reports)"]})]}),(0,b.jsx)(m.TabsContent,{value:"timetable",className:"space-y-6",children:(0,b.jsxs)(h.Card,{className:"bg-black/20 border-white/10",children:[(0,b.jsxs)(h.CardHeader,{children:[(0,b.jsx)(h.CardTitle,{children:"Configure Timetable"}),(0,b.jsx)(h.CardDescription,{children:"Select a class to set exam dates and times for each subject."})]}),(0,b.jsxs)(h.CardContent,{className:"space-y-6",children:[(0,b.jsxs)("div",{className:"flex items-center gap-4",children:[(0,b.jsx)(k.Label,{children:"Select Class:"}),(0,b.jsxs)(l.Select,{value:I,onValueChange:J,children:[(0,b.jsx)(l.SelectTrigger,{className:"w-[200px] bg-white/5 border-white/10",children:(0,b.jsx)(l.SelectValue,{placeholder:"Choose Class"})}),(0,b.jsx)(l.SelectContent,{children:M.map(a=>(0,b.jsx)(l.SelectItem,{value:a.id,children:a.name},a.id))})]}),I&&(0,b.jsxs)(g.Button,{onClick:P,disabled:G,className:"bg-emerald-600 hover:bg-emerald-700 text-white ml-auto",children:[G?(0,b.jsx)(o.Loader2,{className:"animate-spin"}):(0,b.jsx)(p.Save,{className:"w-4 h-4 mr-2"}),"Save Timetable"]})]}),I&&(0,b.jsxs)("div",{className:"space-y-4",children:[(0,b.jsx)("div",{className:"md:hidden space-y-3",children:N.map(a=>{let c=K[a.id]||{enabled:!1};return(0,b.jsxs)("div",{className:(0,y.cn)("bg-black/20 border border-white/10 rounded-2xl p-4 space-y-4 backdrop-blur-md transition-all",c.enabled?"ring-1 ring-emerald-500/30":"opacity-60"),children:[(0,b.jsxs)("div",{className:"flex items-center justify-between",children:[(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsx)("div",{className:"flex items-center",children:(0,b.jsx)("input",{type:"checkbox",checked:!!c.enabled,onChange:b=>Q(a.id,"enabled",b.target.checked),className:"w-5 h-5 rounded border-white/20 bg-black/40 accent-emerald-500"})}),(0,b.jsx)("span",{className:"font-bold text-sm text-white",children:a.name})]}),(0,b.jsx)(n.Badge,{variant:c.enabled?"default":"outline",className:(0,y.cn)("text-[8px] font-black uppercase tracking-tighter py-0 h-4",c.enabled?"bg-emerald-500/10 text-emerald-400 border-none":"text-white/20"),children:c.enabled?"Included":"Excluded"})]}),c.enabled&&(0,b.jsxs)("div",{className:"grid grid-cols-1 gap-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-300",children:[(0,b.jsxs)("div",{className:"space-y-1.5 font-mono",children:[(0,b.jsxs)("label",{className:"text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5",children:[(0,b.jsx)(s.Calendar,{className:"w-3 h-3"})," Exam Date"]}),(0,b.jsx)(j.Input,{type:"date",value:c.date||"",onChange:b=>Q(a.id,"date",b.target.value),className:"h-10 bg-white/5 border-white/10 w-full text-xs",min:C.startDate,max:C.endDate})]}),(0,b.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,b.jsxs)("div",{className:"space-y-1.5 font-mono",children:[(0,b.jsxs)("label",{className:"text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5",children:[(0,b.jsx)(t.Clock,{className:"w-3 h-3"})," Start"]}),(0,b.jsx)(j.Input,{type:"time",value:c.startTime||"",onChange:b=>Q(a.id,"startTime",b.target.value),className:"h-10 bg-white/5 border-white/10 w-full text-xs"})]}),(0,b.jsxs)("div",{className:"space-y-1.5 font-mono",children:[(0,b.jsxs)("label",{className:"text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5",children:[(0,b.jsx)(t.Clock,{className:"w-3 h-3"})," End"]}),(0,b.jsx)(j.Input,{type:"time",value:c.endTime||"",onChange:b=>Q(a.id,"endTime",b.target.value),className:"h-10 bg-white/5 border-white/10 w-full text-xs"})]})]})]})]},a.id)})}),(0,b.jsx)("div",{className:"hidden md:block border border-white/10 rounded-lg overflow-x-auto",children:(0,b.jsxs)("table",{className:"w-full text-sm min-w-[700px]",children:[(0,b.jsx)("thead",{className:"bg-white/5",children:(0,b.jsxs)("tr",{children:[(0,b.jsx)("th",{className:"p-3 text-left w-10",children:"Include"}),(0,b.jsx)("th",{className:"p-3 text-left",children:"Subject"}),(0,b.jsx)("th",{className:"p-3 text-left",children:"Date"}),(0,b.jsx)("th",{className:"p-3 text-left",children:"Start Time"}),(0,b.jsx)("th",{className:"p-3 text-left",children:"End Time"})]})}),(0,b.jsx)("tbody",{className:"divide-y divide-white/5",children:N.map(a=>{let c=K[a.id]||{enabled:!1};return(0,b.jsxs)("tr",{className:c.enabled?"bg-white/[0.02]":"opacity-50",children:[(0,b.jsx)("td",{className:"p-3",children:(0,b.jsx)("input",{type:"checkbox",checked:!!c.enabled,onChange:b=>Q(a.id,"enabled",b.target.checked),className:"w-4 h-4 rounded border-white/20 bg-black/40"})}),(0,b.jsx)("td",{className:"p-3 font-medium",children:a.name}),(0,b.jsx)("td",{className:"p-3",children:(0,b.jsx)(j.Input,{type:"date",value:c.date||"",onChange:b=>Q(a.id,"date",b.target.value),className:"h-8 bg-black/20 border-white/10 w-40",disabled:!c.enabled,min:C.startDate,max:C.endDate})}),(0,b.jsx)("td",{className:"p-3",children:(0,b.jsx)(j.Input,{type:"time",value:c.startTime||"",onChange:b=>Q(a.id,"startTime",b.target.value),className:"h-8 bg-black/20 border-white/10 w-32",disabled:!c.enabled})}),(0,b.jsx)("td",{className:"p-3",children:(0,b.jsx)(j.Input,{type:"time",value:c.endTime||"",onChange:b=>Q(a.id,"endTime",b.target.value),className:"h-8 bg-black/20 border-white/10 w-32",disabled:!c.enabled})})]},a.id)})})]})})]})]})]})}),(0,b.jsx)(m.TabsContent,{value:"documents",children:(0,b.jsxs)(h.Card,{className:"bg-black/20 border-white/10",children:[(0,b.jsxs)(h.CardHeader,{children:[(0,b.jsx)(h.CardTitle,{children:"Generate Documents"}),(0,b.jsx)(h.CardDescription,{children:"Select a class to generate hall tickets or final report cards."})]}),(0,b.jsxs)(h.CardContent,{className:"space-y-6",children:[(0,b.jsxs)("div",{className:"flex flex-col md:flex-row md:items-center gap-4",children:[(0,b.jsxs)("div",{className:"flex items-center gap-4 flex-1",children:[(0,b.jsx)(k.Label,{className:"shrink-0",children:"Select Class:"}),(0,b.jsxs)(l.Select,{value:I,onValueChange:J,children:[(0,b.jsx)(l.SelectTrigger,{className:"w-full md:w-[200px] bg-white/5 border-white/10",children:(0,b.jsx)(l.SelectValue,{placeholder:"Choose Class"})}),(0,b.jsx)(l.SelectContent,{children:M.map(a=>(0,b.jsx)(l.SelectItem,{value:a.id,children:a.name},a.id))})]})]}),I&&(0,b.jsxs)("div",{className:"flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto",children:[(0,b.jsx)("div",{className:"w-full sm:w-auto",children:(0,b.jsx)(x,{exam:C,classId:I})}),(0,b.jsxs)(g.Button,{onClick:()=>{window.open(`/admin/exams/${v}/print/${I}`,"_blank")},className:"w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11",children:[(0,b.jsx)(q.Printer,{className:"w-4 h-4"})," Print Hall Tickets"]})]})]}),(0,b.jsxs)("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-emerald-300 text-sm",children:[(0,b.jsxs)("h4",{className:"font-bold flex items-center mb-2",children:[(0,b.jsx)(u.FileText,{className:"w-4 h-4 mr-2"})," Printing Instructions"]}),(0,b.jsxs)("ul",{className:"list-disc list-inside space-y-1",children:[(0,b.jsx)("li",{children:"Ensure the timetable is configured for the selected class before printing."}),(0,b.jsxs)("li",{children:["Hall tickets will be generated for all ",(0,b.jsx)("b",{children:"ACTIVE"})," students in the class."]}),(0,b.jsx)("li",{children:'The print view will open in a new tab. Use browser print (Ctrl+P) setting "Background Graphics" ON.'})]})]})]})]})})]})]}):null}a.s(["default",()=>A],82149)}];

//# sourceMappingURL=src_app_admin_exams_%5Bid%5D_page_tsx_58ef5f8c._.js.map