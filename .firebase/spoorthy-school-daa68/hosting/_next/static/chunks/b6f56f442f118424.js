(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,15288,e=>{"use strict";var t=e.i(43476),a=e.i(71645),s=e.i(75157);let i=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)("div",{ref:i,className:(0,s.cn)("rounded-2xl border border-[#64FFDA]/10 bg-[#112240]/40 backdrop-blur-lg text-white shadow-xl transition-all duration-300 hover:bg-[#112240]/60 hover:border-[#64FFDA]/30 hover:shadow-[0_0_20px_-5px_rgba(100,255,218,0.1)] group",e),...a}));i.displayName="Card";let l=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)("div",{ref:i,className:(0,s.cn)("flex flex-col space-y-1.5 p-6",e),...a}));l.displayName="CardHeader";let r=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)("h3",{ref:i,className:(0,s.cn)("font-bold text-xl tracking-tight text-white group-hover:text-accent transition-colors",e),...a}));r.displayName="CardTitle";let n=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)("p",{ref:i,className:(0,s.cn)("text-sm text-white/60 font-medium",e),...a}));n.displayName="CardDescription";let o=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)("div",{ref:i,className:(0,s.cn)("p-6 pt-0",e),...a}));o.displayName="CardContent",a.forwardRef(({className:e,...a},i)=>(0,t.jsx)("div",{ref:i,className:(0,s.cn)("flex items-center p-6 pt-0",e),...a})).displayName="CardFooter",e.s(["Card",()=>i,"CardContent",()=>o,"CardDescription",()=>n,"CardHeader",()=>l,"CardTitle",()=>r])},87316,61277,e=>{"use strict";let t=(0,e.i(75254).default)("calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);e.s(["default",()=>t],61277),e.s(["Calendar",()=>t],87316)},3281,e=>{"use strict";let t=(0,e.i(75254).default)("printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);e.s(["Printer",()=>t],3281)},93479,e=>{"use strict";var t=e.i(43476),a=e.i(71645),s=e.i(75157);let i=a.forwardRef(({className:e,type:a,...i},l)=>(0,t.jsx)("input",{type:a,className:(0,s.cn)("flex h-12 w-full rounded-full border border-white/10 bg-[#282828] px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-inner hover:bg-[#333]",e),ref:l,...i}));i.displayName="Input",e.s(["Input",()=>i])},10204,e=>{"use strict";var t=e.i(43476),a=e.i(71645),s=e.i(75157);let i=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)("label",{ref:i,className:(0,s.cn)("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",e),...a}));i.displayName="Label",e.s(["Label",()=>i])},76639,e=>{"use strict";var t=e.i(43476),a=e.i(71645),s=e.i(26999),i=e.i(37727),l=e.i(75157);let r=s.Root,n=s.Trigger,o=s.Portal;s.Close;let d=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)(s.Overlay,{ref:i,className:(0,l.cn)("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",e),...a}));d.displayName=s.Overlay.displayName;let c=a.forwardRef(({className:e,children:a,...r},n)=>(0,t.jsxs)(o,{children:[(0,t.jsx)(d,{}),(0,t.jsxs)(s.Content,{ref:n,className:(0,l.cn)("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",e),...r,children:[a,(0,t.jsxs)(s.Close,{className:"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",children:[(0,t.jsx)(i.X,{className:"h-4 w-4"}),(0,t.jsx)("span",{className:"sr-only",children:"Close"})]})]})]}));c.displayName=s.Content.displayName;let m=({className:e,...a})=>(0,t.jsx)("div",{className:(0,l.cn)("flex flex-col space-y-1.5 text-center sm:text-left",e),...a});m.displayName="DialogHeader";let p=({className:e,...a})=>(0,t.jsx)("div",{className:(0,l.cn)("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",e),...a});p.displayName="DialogFooter";let x=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)(s.Title,{ref:i,className:(0,l.cn)("text-lg font-semibold leading-none tracking-tight",e),...a}));x.displayName=s.Title.displayName;let h=a.forwardRef(({className:e,...a},i)=>(0,t.jsx)(s.Description,{ref:i,className:(0,l.cn)("text-sm text-muted-foreground",e),...a}));h.displayName=s.Description.displayName,e.s(["Dialog",()=>r,"DialogContent",()=>c,"DialogDescription",()=>h,"DialogFooter",()=>p,"DialogHeader",()=>m,"DialogTitle",()=>x,"DialogTrigger",()=>n])},87130,e=>{"use strict";let t=(0,e.i(75254).default)("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);e.s(["Filter",()=>t],87130)},32060,e=>{"use strict";var t=e.i(43476),a=e.i(71645);e.i(36180);var s=e.i(98925),i=e.i(59141),l=e.i(19455),r=e.i(15288),n=e.i(76639),o=e.i(93479),d=e.i(10204),c=e.i(87486),m=e.i(31278),p=e.i(7233),x=e.i(87316),h=e.i(63059),g=e.i(51501),u=e.i(54385);let f=(0,e.i(75254).default)("sparkle",[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}]]);var b=e.i(55436),v=e.i(87130),w=e.i(61659),N=e.i(3281);function j({students:e}){let[r,c]=(0,a.useState)(!1),[m,p]=(0,a.useState)("ANNUAL EXAMINATIONS - 2025-26"),[x,h]=(0,a.useState)(null);return(0,a.useEffect)(()=>{(0,s.getDoc)((0,s.doc)(i.db,"settings","branding")).then(e=>{e.exists()&&h(e.data())})},[]),(0,t.jsxs)(n.Dialog,{open:r,onOpenChange:c,children:[(0,t.jsx)(n.DialogTrigger,{asChild:!0,children:(0,t.jsxs)(l.Button,{variant:"outline",className:"gap-2 border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 w-full sm:w-auto font-bold h-11",children:[(0,t.jsx)(w.CreditCard,{className:"w-4 h-4"})," Hall Tickets"]})}),(0,t.jsxs)(n.DialogContent,{className:"bg-black/95 border-white/10 text-white w-[95vw] sm:max-w-sm",children:[(0,t.jsx)(n.DialogHeader,{children:(0,t.jsx)(n.DialogTitle,{children:"Issue Hall Tickets"})}),(0,t.jsxs)("div",{className:"py-4 space-y-6",children:[(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)(d.Label,{children:"Examination Name"}),(0,t.jsx)(o.Input,{value:m,onChange:e=>p(e.target.value.toUpperCase()),className:"bg-white/5 border-white/10"})]}),(0,t.jsxs)("div",{className:"p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg",children:[(0,t.jsxs)("p",{className:"text-sm font-bold",children:["$",e.length," Hall Tickets Selected"]}),(0,t.jsx)("p",{className:"text-[10px] text-muted-foreground mt-1",children:"Layout: 2 per A4 Page. Automatic handling of odd numbers (last half page will be empty)."})]}),(0,t.jsxs)(l.Button,{onClick:()=>{let t=window.open("","_blank");if(!t)return;let a=`
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
                ${Array.from({length:Math.ceil(e.length/2)}).map((t,a)=>`
                    <div class="page">
                        ${[0,1].map(t=>{let s=e[2*a+t];return s?`
                                <div class="ticket-container">
                                    <div class="watermark">OFFICIAL</div>
                                    
                                    <div class="header">
                                        <div class="logo-container">
                                            ${x?.schoolLogo?`<img src="${x.schoolLogo}" class="logo" />`:""}
                                        </div>
                                        <div class="header-content">
                                            <h1 class="school-name">${x?.schoolName||"Spoorthy Concept School"}</h1>
                                            <div class="sub-header">Affiliated to Recognition of Govt. of Telangana</div>
                                            <div class="badge-container">${m}</div>
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
                                                <span class="field-value">${s.studentName.toUpperCase()}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">School ID / UID</span>
                                                <span class="field-value">${s.schoolId}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">Roll Number</span>
                                                <span class="field-value">${s.rollNo||"NOT ASSIGNED"}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">Class & Section</span>
                                                <span class="field-value">${s.className} – ${s.sectionName||"A"}</span>
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
                                            ${x?.principalSignature?`<img src="${x.principalSignature}" class="principal-sign-img" />`:""}
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
        `;t.document.write(a),t.document.close(),c(!1)},disabled:0===e.length,className:"w-full bg-white text-black hover:bg-white/90 font-bold h-12 gap-2",children:[(0,t.jsx)(N.Printer,{className:"w-5 h-5"})," Print $",e.length," Hall Tickets"]})]})]})]})}var y=e.i(75157),k=e.i(22016),C=e.i(18566);function D(){let[e,w]=(0,a.useState)([]),[N,D]=(0,a.useState)(!0),[A,S]=(0,a.useState)(!1),[z,T]=(0,a.useState)(!1),B=(0,C.useRouter)(),[I,R]=(0,a.useState)({name:"",startDate:"",endDate:""}),[E,L]=(0,a.useState)([]),$=async()=>{try{let e=(0,s.query)((0,s.collection)(i.db,"exams"),(0,s.orderBy)("createdAt","desc")),t=await (0,s.getDocs)(e);w(t.docs.map(e=>({id:e.id,...e.data()})))}catch(e){console.error(e)}finally{D(!1)}};(0,a.useEffect)(()=>{(async()=>{let e=(0,s.query)((0,s.collection)(i.db,"students"),(0,s.where)("status","==","ACTIVE"));L((await (0,s.getDocs)(e)).docs.map(e=>({id:e.id,...e.data()})))})(),$()},[]);let F=async()=>{if(I.name&&I.startDate&&I.endDate){T(!0);try{let e=await (0,s.addDoc)((0,s.collection)(i.db,"exams"),{...I,createdAt:(0,s.serverTimestamp)(),status:"ACTIVE"});S(!1),R({name:"",startDate:"",endDate:""}),B.push(`/admin/exams/${e.id}`)}catch(e){alert("Error: "+e.message)}finally{T(!1)}}};return N?(0,t.jsx)("div",{className:"flex justify-center p-20",children:(0,t.jsx)(m.Loader2,{className:"animate-spin"})}):(0,t.jsxs)("div",{className:"space-y-8 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500",children:[(0,t.jsxs)("div",{className:"relative overflow-hidden rounded-3xl bg-[#0F172A] border border-white/5 p-6 md:p-10 shadow-2xl",children:[(0,t.jsx)("div",{className:"absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full -mr-20 -mt-20 px-4"}),(0,t.jsx)("div",{className:"absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500/5 blur-[80px] rounded-full -ml-10 -mb-10"}),(0,t.jsxs)("div",{className:"relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6",children:[(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsxs)("div",{className:"flex items-center gap-2 mb-2",children:[(0,t.jsx)("span",{className:"p-1.5 bg-blue-500/20 rounded-lg text-blue-400",children:(0,t.jsx)(g.GraduationCap,{className:"w-5 h-5"})}),(0,t.jsx)("span",{className:"text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80",children:"Academic Portal"})]}),(0,t.jsx)("h1",{className:"text-4xl md:text-5xl font-display font-black text-white tracking-tight",children:"Examinations"}),(0,t.jsx)("p",{className:"text-[#8892B0] max-w-xl text-sm md:text-base font-medium leading-relaxed",children:"Orchestrate academic excellence. Manage examination schedules, student roll numbers, and propagate hall tickets in real-time across the school system."})]}),(0,t.jsxs)("div",{className:"flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 md:mt-0",children:[(0,t.jsx)(j,{students:E}),(0,t.jsxs)(l.Button,{onClick:()=>S(!0),className:"bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-[0_0_20px_-5px_theme(colors.emerald.500/0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]",children:[(0,t.jsx)(p.Plus,{className:"mr-2 h-4 w-4 stroke-[3px]"})," Create New Exam"]})]})]})]}),(0,t.jsxs)("div",{className:"space-y-6",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between px-2",children:[(0,t.jsx)("div",{className:"flex items-center gap-4",children:(0,t.jsxs)("h2",{className:"text-lg font-bold text-white flex items-center gap-2",children:["Active Assessments",(0,t.jsx)(c.Badge,{variant:"outline",className:"bg-white/5 border-white/10 text-white/40 text-[10px] py-0",children:e.length})]})}),(0,t.jsx)("div",{className:"flex items-center gap-2",children:(0,t.jsxs)("div",{className:"flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-lg",children:[(0,t.jsx)(l.Button,{variant:"ghost",size:"icon",className:"h-8 w-8 text-white/40 hover:text-white",children:(0,t.jsx)(v.Filter,{className:"w-4 h-4"})}),(0,t.jsx)(l.Button,{variant:"ghost",size:"icon",className:"h-8 w-8 text-white/40 hover:text-white",children:(0,t.jsx)(b.Search,{className:"w-4 h-4"})})]})})]}),(0,t.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",children:[e.map(e=>(0,t.jsx)(k.default,{href:`/admin/exams/${e.id}`,children:(0,t.jsxs)(r.Card,{className:"group relative bg-[#1E293B]/40 hover:bg-[#1E293B]/60 border-white/5 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-xl overflow-hidden rounded-3xl shadow-xl h-full flex flex-col",children:[(0,t.jsx)("div",{className:(0,y.cn)("absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-10 -mt-10 transition-opacity opacity-20 group-hover:opacity-40","ACTIVE"===e.status?"bg-emerald-500":"bg-blue-500")}),(0,t.jsxs)(r.CardHeader,{className:"relative z-10 pb-2",children:[(0,t.jsxs)("div",{className:"flex justify-between items-start",children:[(0,t.jsx)("div",{className:"w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300",children:(0,t.jsx)(u.ClipboardCheck,{className:"w-6 h-6"})}),(0,t.jsxs)(c.Badge,{variant:"outline",className:(0,y.cn)("text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none","ACTIVE"===e.status?"bg-emerald-500/10 text-emerald-400":"bg-blue-500/10 text-blue-400"),children:[(0,t.jsx)(f,{className:"w-2.5 h-2.5 mr-1 animate-pulse"})," ",e.status]})]}),(0,t.jsx)(r.CardTitle,{className:"mt-6 text-xl md:text-2xl font-black text-white group-hover:text-blue-400 transition-colors tracking-tight",children:e.name}),(0,t.jsxs)(r.CardDescription,{className:"flex items-center gap-2 text-[#8892B0] font-medium text-xs mt-1",children:[(0,t.jsx)(x.Calendar,{className:"w-3.5 h-3.5"}),new Date(e.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})," – ",new Date(e.endDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})]})]}),(0,t.jsx)(r.CardContent,{className:"relative z-10 mt-auto pt-6 border-t border-white/5 bg-white/[0.02]",children:(0,t.jsxs)("div",{className:"flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors",children:[(0,t.jsx)("span",{children:"System Node v1.0"}),(0,t.jsxs)("div",{className:"flex items-center gap-2",children:["Manage ",(0,t.jsx)(h.ChevronRight,{className:"w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform"})]})]})})]})},e.id)),0===e.length&&(0,t.jsx)("div",{className:"col-span-full",children:(0,t.jsxs)("div",{className:"group relative overflow-hidden bg-black/20 border border-dashed border-white/10 rounded-[32px] p-20 flex flex-col items-center text-center transition-all hover:bg-black/30 hover:border-blue-500/20",children:[(0,t.jsx)("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px] rounded-full"}),(0,t.jsxs)("div",{className:"relative z-10",children:[(0,t.jsx)("div",{className:"w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-500 group-hover:border-blue-500/20 shadow-2xl",children:(0,t.jsx)(f,{className:"w-10 h-10 text-white/20 group-hover:text-blue-400/50 transition-colors"})}),(0,t.jsx)("h3",{className:"text-2xl font-black text-white mb-2 tracking-tight",children:"Initialize Academic Session"}),(0,t.jsx)("p",{className:"text-[#8892B0] max-w-sm mx-auto font-medium text-sm leading-relaxed mb-8",children:"There are currently no active examinations in the system. Launch a new assessment to begin tracking academic progress."}),(0,t.jsx)(l.Button,{onClick:()=>S(!0),className:"bg-white text-black hover:bg-blue-400 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] h-11 px-8 rounded-xl shadow-2xl transition-all",children:"Deploy Examination"})]})]})})]})]}),(0,t.jsx)(n.Dialog,{open:A,onOpenChange:S,children:(0,t.jsxs)(n.DialogContent,{className:"bg-[#0F172A] border-white/10 text-white rounded-[32px] max-w-lg p-0 overflow-hidden shadow-2xl backdrop-blur-2xl",children:[(0,t.jsxs)("div",{className:"bg-blue-600/10 p-8 border-b border-white/5 relative",children:[(0,t.jsx)("div",{className:"absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full -mr-10 -mt-10"}),(0,t.jsx)(n.DialogTitle,{className:"text-3xl font-black tracking-tight relative z-10",children:"New Session"}),(0,t.jsx)("p",{className:"text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 relative z-10",children:"Initializing Examination Node"})]}),(0,t.jsxs)("div",{className:"p-8 space-y-6",children:[(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)(d.Label,{className:"text-[10px] font-black uppercase tracking-widest text-[#8892B0]",children:"Examination Identity"}),(0,t.jsx)(o.Input,{placeholder:"e.g. ANNUAL EXAMS 2026",className:"bg-white/5 border-white/10 h-14 rounded-2xl text-lg font-bold placeholder:text-white/20 focus:ring-blue-500/50",value:I.name,onChange:e=>R({...I,name:e.target.value})})]}),(0,t.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)(d.Label,{className:"text-[10px] font-black uppercase tracking-widest text-[#8892B0]",children:"Launch Date"}),(0,t.jsx)(o.Input,{type:"date",className:"bg-white/5 border-white/10 h-14 rounded-2xl font-bold focus:ring-blue-500/50",value:I.startDate,onChange:e=>R({...I,startDate:e.target.value})})]}),(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)(d.Label,{className:"text-[10px] font-black uppercase tracking-widest text-[#8892B0]",children:"Final Date"}),(0,t.jsx)(o.Input,{type:"date",className:"bg-white/5 border-white/10 h-14 rounded-2xl font-bold focus:ring-blue-500/50",value:I.endDate,onChange:e=>R({...I,endDate:e.target.value})})]})]})]}),(0,t.jsxs)("div",{className:"p-6 bg-white/[0.02] border-t border-white/5 flex gap-3",children:[(0,t.jsx)(l.Button,{variant:"ghost",onClick:()=>S(!1),className:"flex-1 h-12 rounded-xl font-bold text-white/40 hover:text-white",children:"Abort"}),(0,t.jsx)(l.Button,{onClick:F,disabled:z||!I.name||!I.startDate||!I.endDate,className:"flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-[0_0_20px_-5px_theme(colors.blue.600/0.5)] transition-all",children:z?(0,t.jsx)(m.Loader2,{className:"animate-spin"}):"Authorize & Deploy"})]})]})})]})}e.s(["default",()=>D],32060)}]);