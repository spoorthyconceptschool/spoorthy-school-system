module.exports=[58500,a=>{"use strict";var b=a.i(87924),c=a.i(72131);a.i(69387);var d=a.i(60574),e=a.i(20237),f=a.i(99570),g=a.i(91119),h=a.i(14574),i=a.i(66718),j=a.i(70430),k=a.i(86304),l=a.i(96221),m=a.i(15618),n=a.i(41675),o=a.i(50522),p=a.i(69769),q=a.i(76803);let r=(0,a.i(70106).default)("sparkle",[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}]]);var s=a.i(87532),t=a.i(69012),u=a.i(11156),v=a.i(71931);function w({students:a}){let[g,k]=(0,c.useState)(!1),[l,m]=(0,c.useState)("ANNUAL EXAMINATIONS - 2025-26"),[n,o]=(0,c.useState)(null);return(0,c.useEffect)(()=>{(0,d.getDoc)((0,d.doc)(e.db,"settings","branding")).then(a=>{a.exists()&&o(a.data())})},[]),(0,b.jsxs)(h.Dialog,{open:g,onOpenChange:k,children:[(0,b.jsx)(h.DialogTrigger,{asChild:!0,children:(0,b.jsxs)(f.Button,{variant:"outline",className:"gap-2 border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 w-full sm:w-auto font-bold h-11",children:[(0,b.jsx)(u.CreditCard,{className:"w-4 h-4"})," Hall Tickets"]})}),(0,b.jsxs)(h.DialogContent,{className:"bg-black/95 border-white/10 text-white w-[95vw] sm:max-w-sm",children:[(0,b.jsx)(h.DialogHeader,{children:(0,b.jsx)(h.DialogTitle,{children:"Issue Hall Tickets"})}),(0,b.jsxs)("div",{className:"py-4 space-y-6",children:[(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(j.Label,{children:"Examination Name"}),(0,b.jsx)(i.Input,{value:l,onChange:a=>m(a.target.value.toUpperCase()),className:"bg-white/5 border-white/10"})]}),(0,b.jsxs)("div",{className:"p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg",children:[(0,b.jsxs)("p",{className:"text-sm font-bold",children:["$",a.length," Hall Tickets Selected"]}),(0,b.jsx)("p",{className:"text-[10px] text-muted-foreground mt-1",children:"Layout: 2 per A4 Page. Automatic handling of odd numbers (last half page will be empty)."})]}),(0,b.jsxs)(f.Button,{onClick:()=>{let b=window.open("","_blank");if(!b)return;let c=`
            <html>
            <head>
                <title>Hall Tickets - Official Batch</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { 
                        font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; 
                        margin: 0; 
                        padding: 0; 
                        background: #f0f2f5; 
                        color: #1e293b;
                    }
                    .page { 
                        width: 210mm;
                        height: 297mm;
                        padding: 10mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        gap: 10mm;
                        page-break-after: always;
                        background: #fff;
                    }
                    .ticket-container {
                        flex: 1;
                        position: relative;
                        border: 3pt double #1e40af; /* Formal Navy Blue Border */
                        padding: 8mm;
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                        overflow: hidden;
                    }
                    
                    /* Security Watermark */
                    .watermark {
                        position: absolute;
                        top: 55%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-30deg);
                        font-size: 80pt;
                        font-weight: 900;
                        color: rgba(30, 64, 175, 0.03);
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 0;
                        text-transform: uppercase;
                    }

                    .header { 
                        position: relative;
                        z-index: 1;
                        border-bottom: 1.5pt solid #1e40af; 
                        padding-bottom: 4mm; 
                        margin-bottom: 6mm; 
                        display: flex;
                        align-items: center;
                        gap: 8mm;
                    }
                    .logo-container {
                        width: 25mm;
                        height: 25mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .logo { max-height: 100%; max-width: 100%; object-fit: contain; }
                    .header-content { flex: 1; }
                    .school-name { 
                        font-size: 22pt; 
                        font-weight: 900; 
                        text-transform: uppercase; 
                        color: #1e3a8a; 
                        margin: 0;
                        letter-spacing: -0.5px;
                    }
                    .sub-header { 
                        font-size: 9pt; 
                        text-transform: uppercase; 
                        font-weight: 700; 
                        letter-spacing: 1px; 
                        color: #64748b;
                        margin-top: 1mm;
                    }
                    .badge-container {
                        margin-top: 3mm;
                        display: inline-flex;
                        align-items: center;
                        background: #1e40af;
                        color: #fff;
                        padding: 1.5mm 6mm;
                        border-radius: 4px;
                        font-weight: 800;
                        font-size: 11pt;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                    }

                    .main-content { 
                        position: relative;
                        z-index: 1;
                        display: flex; 
                        gap: 8mm; 
                    }
                    .photo-area { 
                        width: 35mm; 
                        height: 45mm; 
                        border: 1pt solid #cbd5e1; 
                        background: #f8fafc;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        font-size: 7pt;
                        font-weight: 700;
                        color: #94a3b8;
                        text-transform: uppercase;
                    }
                    .barcode-box {
                        margin-top: 3mm;
                        width: 100%;
                        height: 10mm;
                        background: repeating-linear-gradient(90deg, #000, #000 1px, transparent 1px, transparent 3px);
                        opacity: 0.3;
                    }

                    .details-grid { 
                        flex: 1; 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 5mm; 
                    }
                    .field { display: flex; flex-direction: column; }
                    .field-full { grid-column: span 2; }
                    .field-label { 
                        font-size: 7.5pt; 
                        font-weight: 800; 
                        text-transform: uppercase; 
                        color: #64748b; 
                        margin-bottom: 0.5mm;
                    }
                    .field-value { 
                        font-size: 13pt; 
                        font-weight: 800; 
                        color: #0f172a;
                        padding: 1.5mm 0;
                        border-bottom: 0.5pt solid #e2e8f0;
                    }

                    .rules-section {
                        position: relative;
                        z-index: 1;
                        margin-top: 6mm;
                        padding: 4mm;
                        background: #f8fafc;
                        border-radius: 6px;
                    }
                    .rules-title {
                        font-size: 7.5pt;
                        font-weight: 900;
                        text-transform: uppercase;
                        color: #1e40af;
                        margin-bottom: 2mm;
                        display: block;
                    }
                    .rules-list {
                        margin: 0;
                        padding-left: 4mm;
                        font-size: 8.5pt;
                        line-height: 1.4;
                        color: #475569;
                        font-weight: 500;
                    }

                    .footer { 
                        margin-top: auto; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-end;
                        padding-top: 6mm;
                    }
                    .sign-col { text-align: center; width: 45mm; }
                    .sign-line { 
                        border-top: 1pt solid #0f172a; 
                        margin-top: 2mm; 
                        padding-top: 1mm; 
                        font-weight: 800; 
                        font-size: 9pt; 
                        text-transform: uppercase; 
                        color: #0f172a;
                    }
                    .principal-sign-img { height: 45px; margin-bottom: -12px; display: block; margin-left: auto; margin-right: auto; }

                    @media print {
                        body { background: #fff; }
                        .page { box-shadow: none; margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${Array.from({length:Math.ceil(a.length/2)}).map((b,c)=>`
                    <div class="page">
                        ${[0,1].map(b=>{let d=a[2*c+b];return d?`
                                <div class="ticket-container">
                                    <div class="watermark">OFFICIAL</div>
                                    
                                    <div class="header">
                                        <div class="logo-container">
                                            ${n?.schoolLogo?`<img src="${n.schoolLogo}" class="logo" />`:""}
                                        </div>
                                        <div class="header-content">
                                            <h1 class="school-name">${n?.schoolName||"Spoorthy Concept School"}</h1>
                                            <div class="sub-header">Affiliated to Recognition of Govt. of Telangana</div>
                                            <div class="badge-container">${l}</div>
                                        </div>
                                    </div>

                                    <div class="main-content">
                                        <div class="photo-area">
                                            Paste Photo<br/>Here
                                            <div class="barcode-box"></div>
                                        </div>
                                        <div class="details-grid">
                                            <div class="field field-full">
                                                <span class="field-label">Student Name</span>
                                                <span class="field-value">${d.studentName.toUpperCase()}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">School ID / UID</span>
                                                <span class="field-value">${d.schoolId}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">Roll Number</span>
                                                <span class="field-value">${d.rollNo||"NOT ASSIGNED"}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">Class & Section</span>
                                                <span class="field-value">${d.className} – ${d.sectionName||"A"}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">Academic Year</span>
                                                <span class="field-value">2025-26</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="rules-section">
                                        <span class="rules-title">Examination Protocol</span>
                                        <ul class="rules-list">
                                            <li>Possession of electronic devices is strictly prohibited in the exam hall.</li>
                                            <li>Candidates must report 30 minutes prior to the commencement of exams.</li>
                                            <li>This hall ticket must be carried for all examination sessions.</li>
                                        </ul>
                                    </div>

                                    <div class="footer">
                                        <div class="sign-col">
                                            <div class="sign-line">Class Teacher</div>
                                        </div>
                                        <div class="sign-col">
                                            <div class="sign-line">Student Signature</div>
                                        </div>
                                        <div class="sign-col">
                                            ${n?.principalSignature?`<img src="${n.principalSignature}" class="principal-sign-img" />`:""}
                                            <div class="sign-line">Principal</div>
                                        </div>
                                    </div>
                                </div>
                            `:'<div style="flex:1"></div>'}).join("")}
                    </div>
                `).join("")}
                <script>
                    window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
                </script>
            </body>
            </html>
        `;b.document.write(c),b.document.close(),k(!1)},disabled:0===a.length,className:"w-full bg-white text-black hover:bg-white/90 font-bold h-12 gap-2",children:[(0,b.jsx)(v.Printer,{className:"w-5 h-5"})," Print $",a.length," Hall Tickets"]})]})]})]})}var x=a.i(68114),y=a.i(38246),z=a.i(50944);function A(){let[a,u]=(0,c.useState)([]),[v,A]=(0,c.useState)(!0),[B,C]=(0,c.useState)(!1),[D,E]=(0,c.useState)(!1),F=(0,z.useRouter)(),[G,H]=(0,c.useState)({name:"",startDate:"",endDate:""}),[I,J]=(0,c.useState)([]),K=async()=>{try{let a=(0,d.query)((0,d.collection)(e.db,"exams"),(0,d.orderBy)("createdAt","desc")),b=await (0,d.getDocs)(a);u(b.docs.map(a=>({id:a.id,...a.data()})))}catch(a){console.error(a)}finally{A(!1)}};(0,c.useEffect)(()=>{(async()=>{let a=(0,d.query)((0,d.collection)(e.db,"students"),(0,d.where)("status","==","ACTIVE"));J((await (0,d.getDocs)(a)).docs.map(a=>({id:a.id,...a.data()})))})(),K()},[]);let L=async()=>{if(G.name&&G.startDate&&G.endDate){E(!0);try{let a=await (0,d.addDoc)((0,d.collection)(e.db,"exams"),{...G,createdAt:(0,d.serverTimestamp)(),status:"ACTIVE"});C(!1),H({name:"",startDate:"",endDate:""}),F.push(`/admin/exams/${a.id}`)}catch(a){alert("Error: "+a.message)}finally{E(!1)}}};return v?(0,b.jsx)("div",{className:"flex justify-center p-20",children:(0,b.jsx)(l.Loader2,{className:"animate-spin"})}):(0,b.jsxs)("div",{className:"space-y-8 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500",children:[(0,b.jsxs)("div",{className:"relative overflow-hidden rounded-3xl bg-[#0F172A] border border-white/5 p-6 md:p-10 shadow-2xl",children:[(0,b.jsx)("div",{className:"absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full -mr-20 -mt-20 px-4"}),(0,b.jsx)("div",{className:"absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500/5 blur-[80px] rounded-full -ml-10 -mb-10"}),(0,b.jsxs)("div",{className:"relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6",children:[(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsxs)("div",{className:"flex items-center gap-2 mb-2",children:[(0,b.jsx)("span",{className:"p-1.5 bg-blue-500/20 rounded-lg text-blue-400",children:(0,b.jsx)(p.GraduationCap,{className:"w-5 h-5"})}),(0,b.jsx)("span",{className:"text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80",children:"Academic Portal"})]}),(0,b.jsx)("h1",{className:"text-4xl md:text-5xl font-display font-black text-white tracking-tight",children:"Examinations"}),(0,b.jsx)("p",{className:"text-[#8892B0] max-w-xl text-sm md:text-base font-medium leading-relaxed",children:"Orchestrate academic excellence. Manage examination schedules, student roll numbers, and propagate hall tickets in real-time across the school system."})]}),(0,b.jsxs)("div",{className:"flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 md:mt-0",children:[(0,b.jsx)(w,{students:I}),(0,b.jsxs)(f.Button,{onClick:()=>C(!0),className:"bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-[0_0_20px_-5px_theme(colors.emerald.500/0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]",children:[(0,b.jsx)(m.Plus,{className:"mr-2 h-4 w-4 stroke-[3px]"})," Create New Exam"]})]})]})]}),(0,b.jsxs)("div",{className:"space-y-6",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between px-2",children:[(0,b.jsx)("div",{className:"flex items-center gap-4",children:(0,b.jsxs)("h2",{className:"text-lg font-bold text-white flex items-center gap-2",children:["Active Assessments",(0,b.jsx)(k.Badge,{variant:"outline",className:"bg-white/5 border-white/10 text-white/40 text-[10px] py-0",children:a.length})]})}),(0,b.jsx)("div",{className:"flex items-center gap-2",children:(0,b.jsxs)("div",{className:"flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-lg",children:[(0,b.jsx)(f.Button,{variant:"ghost",size:"icon",className:"h-8 w-8 text-white/40 hover:text-white",children:(0,b.jsx)(t.Filter,{className:"w-4 h-4"})}),(0,b.jsx)(f.Button,{variant:"ghost",size:"icon",className:"h-8 w-8 text-white/40 hover:text-white",children:(0,b.jsx)(s.Search,{className:"w-4 h-4"})})]})})]}),(0,b.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",children:[a.map(a=>(0,b.jsx)(y.default,{href:`/admin/exams/${a.id}`,children:(0,b.jsxs)(g.Card,{className:"group relative bg-[#1E293B]/40 hover:bg-[#1E293B]/60 border-white/5 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-xl overflow-hidden rounded-3xl shadow-xl h-full flex flex-col",children:[(0,b.jsx)("div",{className:(0,x.cn)("absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-10 -mt-10 transition-opacity opacity-20 group-hover:opacity-40","ACTIVE"===a.status?"bg-emerald-500":"bg-blue-500")}),(0,b.jsxs)(g.CardHeader,{className:"relative z-10 pb-2",children:[(0,b.jsxs)("div",{className:"flex justify-between items-start",children:[(0,b.jsx)("div",{className:"w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300",children:(0,b.jsx)(q.ClipboardCheck,{className:"w-6 h-6"})}),(0,b.jsxs)(k.Badge,{variant:"outline",className:(0,x.cn)("text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none","ACTIVE"===a.status?"bg-emerald-500/10 text-emerald-400":"bg-blue-500/10 text-blue-400"),children:[(0,b.jsx)(r,{className:"w-2.5 h-2.5 mr-1 animate-pulse"})," ",a.status]})]}),(0,b.jsx)(g.CardTitle,{className:"mt-6 text-xl md:text-2xl font-black text-white group-hover:text-blue-400 transition-colors tracking-tight",children:a.name}),(0,b.jsxs)(g.CardDescription,{className:"flex items-center gap-2 text-[#8892B0] font-medium text-xs mt-1",children:[(0,b.jsx)(n.Calendar,{className:"w-3.5 h-3.5"}),new Date(a.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})," – ",new Date(a.endDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})]})]}),(0,b.jsx)(g.CardContent,{className:"relative z-10 mt-auto pt-6 border-t border-white/5 bg-white/[0.02]",children:(0,b.jsxs)("div",{className:"flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors",children:[(0,b.jsx)("span",{children:"System Node v1.0"}),(0,b.jsxs)("div",{className:"flex items-center gap-2",children:["Manage ",(0,b.jsx)(o.ChevronRight,{className:"w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform"})]})]})})]})},a.id)),0===a.length&&(0,b.jsx)("div",{className:"col-span-full",children:(0,b.jsxs)("div",{className:"group relative overflow-hidden bg-black/20 border border-dashed border-white/10 rounded-[32px] p-20 flex flex-col items-center text-center transition-all hover:bg-black/30 hover:border-blue-500/20",children:[(0,b.jsx)("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px] rounded-full"}),(0,b.jsxs)("div",{className:"relative z-10",children:[(0,b.jsx)("div",{className:"w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-500 group-hover:border-blue-500/20 shadow-2xl",children:(0,b.jsx)(r,{className:"w-10 h-10 text-white/20 group-hover:text-blue-400/50 transition-colors"})}),(0,b.jsx)("h3",{className:"text-2xl font-black text-white mb-2 tracking-tight",children:"Initialize Academic Session"}),(0,b.jsx)("p",{className:"text-[#8892B0] max-w-sm mx-auto font-medium text-sm leading-relaxed mb-8",children:"There are currently no active examinations in the system. Launch a new assessment to begin tracking academic progress."}),(0,b.jsx)(f.Button,{onClick:()=>C(!0),className:"bg-white text-black hover:bg-blue-400 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] h-11 px-8 rounded-xl shadow-2xl transition-all",children:"Deploy Examination"})]})]})})]})]}),(0,b.jsx)(h.Dialog,{open:B,onOpenChange:C,children:(0,b.jsxs)(h.DialogContent,{className:"bg-[#0F172A] border-white/10 text-white rounded-[32px] max-w-lg p-0 overflow-hidden shadow-2xl backdrop-blur-2xl",children:[(0,b.jsxs)("div",{className:"bg-blue-600/10 p-8 border-b border-white/5 relative",children:[(0,b.jsx)("div",{className:"absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full -mr-10 -mt-10"}),(0,b.jsx)(h.DialogTitle,{className:"text-3xl font-black tracking-tight relative z-10",children:"New Session"}),(0,b.jsx)("p",{className:"text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 relative z-10",children:"Initializing Examination Node"})]}),(0,b.jsxs)("div",{className:"p-8 space-y-6",children:[(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(j.Label,{className:"text-[10px] font-black uppercase tracking-widest text-[#8892B0]",children:"Examination Identity"}),(0,b.jsx)(i.Input,{placeholder:"e.g. ANNUAL EXAMS 2026",className:"bg-white/5 border-white/10 h-14 rounded-2xl text-lg font-bold placeholder:text-white/20 focus:ring-blue-500/50",value:G.name,onChange:a=>H({...G,name:a.target.value})})]}),(0,b.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(j.Label,{className:"text-[10px] font-black uppercase tracking-widest text-[#8892B0]",children:"Launch Date"}),(0,b.jsx)(i.Input,{type:"date",className:"bg-white/5 border-white/10 h-14 rounded-2xl font-bold focus:ring-blue-500/50",value:G.startDate,onChange:a=>H({...G,startDate:a.target.value})})]}),(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(j.Label,{className:"text-[10px] font-black uppercase tracking-widest text-[#8892B0]",children:"Final Date"}),(0,b.jsx)(i.Input,{type:"date",className:"bg-white/5 border-white/10 h-14 rounded-2xl font-bold focus:ring-blue-500/50",value:G.endDate,onChange:a=>H({...G,endDate:a.target.value})})]})]})]}),(0,b.jsxs)("div",{className:"p-6 bg-white/[0.02] border-t border-white/5 flex gap-3",children:[(0,b.jsx)(f.Button,{variant:"ghost",onClick:()=>C(!1),className:"flex-1 h-12 rounded-xl font-bold text-white/40 hover:text-white",children:"Abort"}),(0,b.jsx)(f.Button,{onClick:L,disabled:D||!G.name||!G.startDate||!G.endDate,className:"flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-[0_0_20px_-5px_theme(colors.blue.600/0.5)] transition-all",children:D?(0,b.jsx)(l.Loader2,{className:"animate-spin"}):"Authorize & Deploy"})]})]})})]})}a.s(["default",()=>A],58500)}];

//# sourceMappingURL=src_app_admin_exams_page_tsx_9a59a771._.js.map