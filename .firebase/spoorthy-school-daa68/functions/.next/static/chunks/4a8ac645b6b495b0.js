(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,15288,e=>{"use strict";var a=e.i(43476),t=e.i(71645),s=e.i(75157);let l=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)("div",{ref:l,className:(0,s.cn)("rounded-2xl border border-[#64FFDA]/10 bg-[#112240]/40 backdrop-blur-lg text-white shadow-xl transition-all duration-300 hover:bg-[#112240]/60 hover:border-[#64FFDA]/30 hover:shadow-[0_0_20px_-5px_rgba(100,255,218,0.1)] group",e),...t}));l.displayName="Card";let i=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)("div",{ref:l,className:(0,s.cn)("flex flex-col space-y-1.5 p-6",e),...t}));i.displayName="CardHeader";let r=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)("h3",{ref:l,className:(0,s.cn)("font-bold text-xl tracking-tight text-white group-hover:text-accent transition-colors",e),...t}));r.displayName="CardTitle";let n=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)("p",{ref:l,className:(0,s.cn)("text-sm text-white/60 font-medium",e),...t}));n.displayName="CardDescription";let d=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)("div",{ref:l,className:(0,s.cn)("p-6 pt-0",e),...t}));d.displayName="CardContent",t.forwardRef(({className:e,...t},l)=>(0,a.jsx)("div",{ref:l,className:(0,s.cn)("flex items-center p-6 pt-0",e),...t})).displayName="CardFooter",e.s(["Card",()=>l,"CardContent",()=>d,"CardDescription",()=>n,"CardHeader",()=>i,"CardTitle",()=>r])},87316,61277,e=>{"use strict";let a=(0,e.i(75254).default)("calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);e.s(["default",()=>a],61277),e.s(["Calendar",()=>a],87316)},3281,e=>{"use strict";let a=(0,e.i(75254).default)("printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);e.s(["Printer",()=>a],3281)},71689,e=>{"use strict";let a=(0,e.i(75254).default)("arrow-left",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);e.s(["ArrowLeft",()=>a],71689)},93479,e=>{"use strict";var a=e.i(43476),t=e.i(71645),s=e.i(75157);let l=t.forwardRef(({className:e,type:t,...l},i)=>(0,a.jsx)("input",{type:t,className:(0,s.cn)("flex h-12 w-full rounded-full border border-white/10 bg-[#282828] px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-inner hover:bg-[#333]",e),ref:i,...l}));l.displayName="Input",e.s(["Input",()=>l])},10204,e=>{"use strict";var a=e.i(43476),t=e.i(71645),s=e.i(75157);let l=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)("label",{ref:l,className:(0,s.cn)("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",e),...t}));l.displayName="Label",e.s(["Label",()=>l])},76639,e=>{"use strict";var a=e.i(43476),t=e.i(71645),s=e.i(26999),l=e.i(37727),i=e.i(75157);let r=s.Root,n=s.Trigger,d=s.Portal;s.Close;let o=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)(s.Overlay,{ref:l,className:(0,i.cn)("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",e),...t}));o.displayName=s.Overlay.displayName;let c=t.forwardRef(({className:e,children:t,...r},n)=>(0,a.jsxs)(d,{children:[(0,a.jsx)(o,{}),(0,a.jsxs)(s.Content,{ref:n,className:(0,i.cn)("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",e),...r,children:[t,(0,a.jsxs)(s.Close,{className:"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",children:[(0,a.jsx)(l.X,{className:"h-4 w-4"}),(0,a.jsx)("span",{className:"sr-only",children:"Close"})]})]})]}));c.displayName=s.Content.displayName;let m=({className:e,...t})=>(0,a.jsx)("div",{className:(0,i.cn)("flex flex-col space-y-1.5 text-center sm:text-left",e),...t});m.displayName="DialogHeader";let p=({className:e,...t})=>(0,a.jsx)("div",{className:(0,i.cn)("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",e),...t});p.displayName="DialogFooter";let u=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)(s.Title,{ref:l,className:(0,i.cn)("text-lg font-semibold leading-none tracking-tight",e),...t}));u.displayName=s.Title.displayName;let h=t.forwardRef(({className:e,...t},l)=>(0,a.jsx)(s.Description,{ref:l,className:(0,i.cn)("text-sm text-muted-foreground",e),...t}));h.displayName=s.Description.displayName,e.s(["Dialog",()=>r,"DialogContent",()=>c,"DialogDescription",()=>h,"DialogFooter",()=>p,"DialogHeader",()=>m,"DialogTitle",()=>u,"DialogTrigger",()=>n])},56909,e=>{"use strict";let a=(0,e.i(75254).default)("save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);e.s(["Save",()=>a],56909)},77572,e=>{"use strict";var a=e.i(43476),t=e.i(71645),s=e.i(81140),l=e.i(30030),i=e.i(42727),r=e.i(96626),n=e.i(48425),d=e.i(86318),o=e.i(69340),c=e.i(10772),m="Tabs",[p,u]=(0,l.createContextScope)(m,[i.createRovingFocusGroupScope]),h=(0,i.createRovingFocusGroupScope)(),[x,f]=p(m),b=t.forwardRef((e,t)=>{let{__scopeTabs:s,value:l,onValueChange:i,defaultValue:r,orientation:p="horizontal",dir:u,activationMode:h="automatic",...f}=e,b=(0,d.useDirection)(u),[g,v]=(0,o.useControllableState)({prop:l,onChange:i,defaultProp:r??"",caller:m});return(0,a.jsx)(x,{scope:s,baseId:(0,c.useId)(),value:g,onValueChange:v,orientation:p,dir:b,activationMode:h,children:(0,a.jsx)(n.Primitive.div,{dir:b,"data-orientation":p,...f,ref:t})})});b.displayName=m;var g="TabsList",v=t.forwardRef((e,t)=>{let{__scopeTabs:s,loop:l=!0,...r}=e,d=f(g,s),o=h(s);return(0,a.jsx)(i.Root,{asChild:!0,...o,orientation:d.orientation,dir:d.dir,loop:l,children:(0,a.jsx)(n.Primitive.div,{role:"tablist","aria-orientation":d.orientation,...r,ref:t})})});v.displayName=g;var w="TabsTrigger",j=t.forwardRef((e,t)=>{let{__scopeTabs:l,value:r,disabled:d=!1,...o}=e,c=f(w,l),m=h(l),p=C(c.baseId,r),u=k(c.baseId,r),x=r===c.value;return(0,a.jsx)(i.Item,{asChild:!0,...m,focusable:!d,active:x,children:(0,a.jsx)(n.Primitive.button,{type:"button",role:"tab","aria-selected":x,"aria-controls":u,"data-state":x?"active":"inactive","data-disabled":d?"":void 0,disabled:d,id:p,...o,ref:t,onMouseDown:(0,s.composeEventHandlers)(e.onMouseDown,e=>{d||0!==e.button||!1!==e.ctrlKey?e.preventDefault():c.onValueChange(r)}),onKeyDown:(0,s.composeEventHandlers)(e.onKeyDown,e=>{[" ","Enter"].includes(e.key)&&c.onValueChange(r)}),onFocus:(0,s.composeEventHandlers)(e.onFocus,()=>{let e="manual"!==c.activationMode;x||d||!e||c.onValueChange(r)})})})});j.displayName=w;var N="TabsContent",y=t.forwardRef((e,s)=>{let{__scopeTabs:l,value:i,forceMount:d,children:o,...c}=e,m=f(N,l),p=C(m.baseId,i),u=k(m.baseId,i),h=i===m.value,x=t.useRef(h);return t.useEffect(()=>{let e=requestAnimationFrame(()=>x.current=!1);return()=>cancelAnimationFrame(e)},[]),(0,a.jsx)(r.Presence,{present:d||h,children:({present:t})=>(0,a.jsx)(n.Primitive.div,{"data-state":h?"active":"inactive","data-orientation":m.orientation,role:"tabpanel","aria-labelledby":p,hidden:!t,id:u,tabIndex:0,...c,ref:s,style:{...e.style,animationDuration:x.current?"0s":void 0},children:t&&o})})});function C(e,a){return`${e}-trigger-${a}`}function k(e,a){return`${e}-content-${a}`}y.displayName=N;var S=e.i(75157);let T=t.forwardRef(({className:e,...t},s)=>(0,a.jsx)(v,{ref:s,className:(0,S.cn)("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",e),...t}));T.displayName=v.displayName;let D=t.forwardRef(({className:e,...t},s)=>(0,a.jsx)(j,{ref:s,className:(0,S.cn)("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",e),...t}));D.displayName=j.displayName;let E=t.forwardRef(({className:e,...t},s)=>(0,a.jsx)(y,{ref:s,className:(0,S.cn)("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",e),...t}));E.displayName=y.displayName,e.s(["Tabs",()=>b,"TabsContent",()=>E,"TabsList",()=>T,"TabsTrigger",()=>D],77572)},70354,e=>{"use strict";var a=e.i(43476),t=e.i(71645);e.i(36180);var s=e.i(98925),l=e.i(59141),i=e.i(72498),r=e.i(19455),n=e.i(15288),d=e.i(76639),o=e.i(93479),c=e.i(10204),m=e.i(67489),p=e.i(77572),u=e.i(87486),h=e.i(31278),x=e.i(56909),f=e.i(3281),b=e.i(71689),g=e.i(87316),v=e.i(3116),w=e.i(78583),j=e.i(69638),N=e.i(63209);function y({exam:e,classId:n}){let[o,c]=(0,t.useState)(!1),[m,p]=(0,t.useState)(!1),[u,x]=(0,t.useState)(null),{subjects:b,classes:g}=(0,i.useMasterData)(),[v,y]=(0,t.useState)([]),[C,k]=(0,t.useState)({});(0,t.useEffect)(()=>{o&&(S(),T())},[o,n,e.id]);let S=async()=>{let e=await (0,s.getDoc)((0,s.doc)(l.db,"settings","branding"));e.exists()&&x(e.data())},T=async()=>{if(n){p(!0);try{let a=(0,s.query)((0,s.collection)(l.db,"students"),(0,s.where)("classId","==",n),(0,s.where)("status","==","ACTIVE")),t=(await (0,s.getDocs)(a)).docs.map(e=>({id:e.id,...e.data()}));t.sort((e,a)=>{let t=parseInt(e.rollNo)||999,s=parseInt(a.rollNo)||999;return t-s||e.studentName.localeCompare(a.studentName)}),y(t);let i=(0,s.query)((0,s.collection)(l.db,"exam_results"),(0,s.where)("examId","==",e.id),(0,s.where)("classId","==",n)),r=await (0,s.getDocs)(i),d={};r.docs.forEach(e=>{d[e.data().studentId]=e.data()}),k(d)}catch(e){console.error(e)}finally{p(!1)}}},D=v.filter(e=>C[e.id]).length;return(0,a.jsxs)(d.Dialog,{open:o,onOpenChange:c,children:[(0,a.jsx)(d.DialogTrigger,{asChild:!0,children:(0,a.jsxs)(r.Button,{variant:"outline",className:"gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",children:[(0,a.jsx)(w.FileText,{className:"w-4 h-4"})," Report Cards"]})}),(0,a.jsxs)(d.DialogContent,{className:"bg-black/95 border-white/10 text-white w-[95vw] sm:max-w-md",children:[(0,a.jsx)(d.DialogHeader,{children:(0,a.jsx)(d.DialogTitle,{children:"Generate Report Cards"})}),(0,a.jsxs)("div",{className:"py-4 space-y-4",children:[(0,a.jsx)("p",{className:"text-sm text-muted-foreground",children:"This will generate formal report cards for the selected class."}),m?(0,a.jsxs)("div",{className:"flex flex-col items-center py-8",children:[(0,a.jsx)(h.Loader2,{className:"w-8 h-8 animate-spin text-emerald-500 mb-2"}),(0,a.jsx)("p",{className:"text-xs",children:"Preparing Student Records..."})]}):(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,a.jsxs)("div",{className:"p-3 bg-white/5 border border-white/10 rounded-lg",children:[(0,a.jsx)("p",{className:"text-[10px] text-muted-foreground uppercase",children:"Class Strength"}),(0,a.jsx)("p",{className:"text-xl font-bold",children:v.length})]}),(0,a.jsxs)("div",{className:"p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg",children:[(0,a.jsx)("p",{className:"text-[10px] text-emerald-400 uppercase",children:"Results Ready"}),(0,a.jsx)("p",{className:"text-xl font-bold text-emerald-400",children:D})]})]}),0===D?(0,a.jsxs)("div",{className:"p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 text-red-400",children:[(0,a.jsx)(N.AlertCircle,{className:"w-5 h-5 shrink-0"}),(0,a.jsx)("p",{className:"text-xs",children:"No marks have been entered for this class yet. Teachers must enter marks before report cards can be generated."})]}):(0,a.jsxs)("div",{className:"p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 text-blue-400",children:[(0,a.jsx)(j.CheckCircle,{className:"w-5 h-5 shrink-0"}),(0,a.jsxs)("p",{className:"text-xs",children:["Ready to print ",D," report cards. Each student will get a full A4 page with breakdown of marks, total, percentage, and principal's signature."]})]}),(0,a.jsxs)(r.Button,{onClick:()=>{let a=window.open("","_blank");if(!a)return;let t=`
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
                ${v.map(a=>{let t=C[a.id];if(!t)return"";let s=Object.entries(t.subjects||{}),l=0,i=0;s.forEach(([e,a])=>{let t=parseFloat(a.obtained),s=parseFloat(a.maxMarks);isNaN(t)||(l+=t),isNaN(s)||(i+=s)});let r=i>0?l/i*100:0,n=r>=90?"A+":r>=80?"A":r>=70?"B+":r>=60?"B":r>=50?"C":r>=35?"D":"E (Fail)";return`
                        <div class="report-card">
                            <div class="document-border"></div>
                            <div class="watermark">
                                ${u?.schoolLogo?`<img src="${u.schoolLogo}" />`:""}
                            </div>

                            <div class="header">
                                ${u?.schoolLogo?`<img src="${u.schoolLogo}" class="logo" />`:""}
                                <div class="header-content">
                                    <h1 class="school-name">${u?.schoolName||"Spoorthy Concept School"}</h1>
                                    <div class="sub-header">Official Academic Record - Recognized by Govt. of Telangana</div>
                                    <div class="document-title">Scholastic Performance Report</div>
                                </div>
                            </div>

                            <div class="profile-grid">
                                <div>
                                    <span class="section-label">Student Identification</span>
                                    <div class="data-card">
                                        <div class="data-row"><span class="label">Legal Name</span> <span class="value">${a.studentName.toUpperCase()}</span></div>
                                        <div class="data-row"><span class="label">Enrollment ID</span> <span class="value">${a.schoolId}</span></div>
                                        <div class="data-row"><span class="label">Class/Section</span> <span class="value">${a.className} – ${a.sectionName||"A"}</span></div>
                                        <div class="data-row"><span class="label">Roll Number</span> <span class="value">${a.rollNo||"N/A"}</span></div>
                                    </div>
                                </div>
                                <div>
                                    <span class="section-label">Academic Detail</span>
                                    <div class="data-card">
                                        <div class="data-row"><span class="label">Examination</span> <span class="value">${e.name}</span></div>
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
                                    ${s.map(([e,a])=>`
                                        <tr>
                                            <td style="font-weight: 800; color: #1e3a8a;">${b[e]?.name||e}</td>
                                            <td class="col-center" style="color: #64748b;">${a.maxMarks}</td>
                                            <td class="col-center col-marks">${a.obtained}</td>
                                            <td style="font-size: 9pt; color: #475569;">${a.remarks||"Satisfactory"}</td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>

                            <div class="summary-grid">
                                <div class="summary-card">
                                    <span class="sum-label">Aggregate Score</span>
                                    <span class="sum-value">${l} <small style="font-size: 10pt; color: #94a3b8;">/ ${i}</small></span>
                                </div>
                                <div class="summary-card">
                                    <span class="sum-label">Percentage</span>
                                    <span class="sum-value">${r.toFixed(1)}%</span>
                                </div>
                                <div class="summary-card">
                                    <span class="sum-label">Scholastic Grade</span>
                                    <span class="sum-value" style="color: #1e40af;">${n}</span>
                                </div>
                            </div>

                            <div class="remarks-box">
                                <span class="remarks-title">Institutional Feedback</span>
                                <p class="remarks-text">
                                    ${r>85?"Exceptional academic proficiency demonstrated. Continues to be an exemplary student.":r>70?"Commendable performance. Shows strong potential for further academic growth.":r>50?"Consistent effort is recommended in core subjects to achieve higher proficiency.":"Focused remedial attention in specific areas required for academic advancement."}
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
                                    ${u?.principalSignature?`<img src="${u.principalSignature}" class="sign-stamp" />`:""}
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
        `;a.document.write(t),a.document.close(),c(!1)},disabled:0===D,className:"w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 gap-2 font-bold",children:[(0,a.jsx)(f.Printer,{className:"w-5 h-5"})," Print ",D," Report Cards"]})]})]})]})]})}var C=e.i(75157),k=e.i(18566);function S({params:e}){let{id:j}=(0,t.use)(e),N=(0,k.useRouter)(),{classes:S,subjects:T}=(0,i.useMasterData)(),[D,E]=(0,t.useState)(null),[R,I]=(0,t.useState)(!0),[L,A]=(0,t.useState)(!1),[$,z]=(0,t.useState)(""),[H,F]=(0,t.useState)({}),P=Object.values(S).map(e=>({id:e.id,name:e.name,order:e.order||99})).sort((e,a)=>e.order-a.order),M=Object.values(T).filter(e=>!1!==e.isActive).sort((e,a)=>e.name.localeCompare(a.name)),B=async()=>{try{let e=await (0,s.getDoc)((0,s.doc)(l.db,"exams",j));e.exists()?E({id:e.id,...e.data()}):N.push("/admin/exams")}catch(e){console.error(e)}finally{I(!1)}};(0,t.useEffect)(()=>{B()},[j]),(0,t.useEffect)(()=>{if($&&D){let e=D.timetables?.[$]||{},a={};M.forEach(t=>{e[t.id]?a[t.id]={...e[t.id],enabled:!0}:a[t.id]={date:"",startTime:"09:00",endTime:"12:00",enabled:!1}}),F(a)}},[$,D]);let U=async()=>{if(!$||!D)return void console.error("Missing selectedClassId or exam data",{selectedClassId:$,exam:D});A(!0),console.log("Saving timetable for class:",$);try{let e={};Object.entries(H).forEach(([a,t])=>{t.enabled&&t.date&&(e[a]={date:t.date,startTime:t.startTime||"09:00",endTime:t.endTime||"12:00"})}),console.log("Cleaned timetable data:",e);let{id:a,...t}=D,i={...t.timetables||{},[$]:e};await (0,s.setDoc)((0,s.doc)(l.db,"exams",j),{...t,timetables:i}),E({id:j,...t,timetables:i}),alert(`Timetable for ${S[$]?.name||"Class"} Saved Successfully!`)}catch(e){console.error("Save Timetable Error:",e),alert("Failed to save: "+e.message)}finally{A(!1)}},V=(e,a,t)=>{F(s=>({...s,[e]:{...s[e],[a]:t}}))},[_,O]=(0,t.useState)(!1),[G,Y]=(0,t.useState)({name:"",startDate:"",endDate:"",examCenter:"SCS-HYD",academicYear:"2025-26",instructions:"Carry this Hall Ticket to the exam hall.\nReport 15 mins before time.\nNo electronic gadgets allowed."});(0,t.useEffect)(()=>{D&&Y({name:D.name,startDate:D.startDate,endDate:D.endDate,examCenter:D.examCenter||"SCS-HYD",academicYear:D.academicYear||"2025-26",instructions:D.instructions||"Carry this Hall Ticket to the exam hall.\nReport 15 mins before time.\nNo electronic gadgets allowed."})},[D]);let K=async()=>{if(G.name&&G.startDate&&G.endDate){A(!0);try{await (0,s.setDoc)((0,s.doc)(l.db,"exams",j),{...D,...G},{merge:!0}),E({...D,...G}),O(!1),alert("Exam Details Updated")}catch(e){console.error(e),alert("Error: "+e.message)}finally{A(!1)}}};return R?(0,a.jsx)("div",{className:"flex justify-center p-20",children:(0,a.jsx)(h.Loader2,{className:"animate-spin"})}):D?(0,a.jsxs)("div",{className:"space-y-6 max-w-7xl mx-auto p-6 animate-in fade-in",children:[(0,a.jsxs)("div",{className:"flex items-center gap-4 mb-6",children:[(0,a.jsx)(r.Button,{variant:"ghost",size:"icon",onClick:()=>N.push("/admin/exams"),children:(0,a.jsx)(b.ArrowLeft,{className:"w-5 h-5"})}),(0,a.jsxs)("div",{className:"flex-1",children:[(0,a.jsxs)("div",{className:"flex items-center gap-3",children:[(0,a.jsx)("h1",{className:"text-3xl font-display font-bold",children:D.name}),(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)("span",{className:`px-2 py-0.5 rounded text-xs font-bold border ${"RESULTS_RELEASED"===D.status?"bg-emerald-500/10 border-emerald-500/20 text-emerald-400":"bg-blue-500/10 border-blue-500/20 text-blue-400"}`,children:"RESULTS_RELEASED"===D.status?"RESULTS PUBLISHED":D.status||"ACTIVE"}),(0,a.jsx)(r.Button,{size:"sm",variant:"outline",className:"h-6 text-xs bg-white/5 border-white/10",onClick:()=>O(!0),children:"Edit"})]})]}),(0,a.jsxs)("p",{className:"text-muted-foreground flex items-center gap-2",children:[(0,a.jsx)(g.Calendar,{className:"w-4 h-4"}),new Date(D.startDate).toLocaleDateString()," - ",new Date(D.endDate).toLocaleDateString()]})]}),(0,a.jsx)("div",{className:"flex gap-2",children:(0,a.jsx)(r.Button,{onClick:async()=>{if(!confirm("RESULTS_RELEASED"===D.status?"Hide results from students?":"Release results to students?"))return;let e="RESULTS_RELEASED"===D.status?"ACTIVE":"RESULTS_RELEASED";await (0,s.setDoc)((0,s.doc)(l.db,"exams",j),{status:e},{merge:!0}),E({...D,status:e})},className:"RESULTS_RELEASED"===D.status?"bg-yellow-600 hover:bg-yellow-700":"bg-emerald-600 hover:bg-emerald-700",children:"RESULTS_RELEASED"===D.status?"Unpublish Results":"Release Results"})})]}),(0,a.jsx)(d.Dialog,{open:_,onOpenChange:O,children:(0,a.jsxs)(d.DialogContent,{className:"bg-black/95 border-white/10 text-white",children:[(0,a.jsx)(d.DialogHeader,{children:(0,a.jsx)(d.DialogTitle,{children:"Edit Exam Details"})}),(0,a.jsxs)("div",{className:"space-y-4 py-4",children:[(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsx)(c.Label,{children:"Exam Name"}),(0,a.jsx)(o.Input,{className:"bg-white/5 border-white/10",value:G.name,onChange:e=>Y({...G,name:e.target.value})})]}),(0,a.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsx)(c.Label,{children:"Academic Year"}),(0,a.jsx)(o.Input,{className:"bg-white/5 border-white/10",value:G.academicYear,onChange:e=>Y({...G,academicYear:e.target.value}),placeholder:"e.g. 2025-26"})]}),(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsx)(c.Label,{children:"Exam Center"}),(0,a.jsx)(o.Input,{className:"bg-white/5 border-white/10",value:G.examCenter,onChange:e=>Y({...G,examCenter:e.target.value})})]})]}),(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsx)(c.Label,{children:"Hall Ticket Instructions (one per line)"}),(0,a.jsx)("textarea",{className:"w-full min-h-[100px] rounded-md bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent",value:G.instructions,onChange:e=>Y({...G,instructions:e.target.value})})]}),(0,a.jsx)(r.Button,{onClick:K,disabled:L,className:"w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4",children:L?(0,a.jsx)(h.Loader2,{className:"animate-spin"}):"Save Changes"})]})]})}),(0,a.jsxs)(p.Tabs,{defaultValue:"timetable",className:"space-y-6",children:[(0,a.jsxs)(p.TabsList,{className:"bg-black/20 border-white/10",children:[(0,a.jsxs)(p.TabsTrigger,{value:"timetable",children:[(0,a.jsx)(v.Clock,{className:"w-4 h-4 mr-2"})," Exam Timetable"]}),(0,a.jsxs)(p.TabsTrigger,{value:"documents",children:[(0,a.jsx)(w.FileText,{className:"w-4 h-4 mr-2"})," Documents (Tickets/Reports)"]})]}),(0,a.jsx)(p.TabsContent,{value:"timetable",className:"space-y-6",children:(0,a.jsxs)(n.Card,{className:"bg-black/20 border-white/10",children:[(0,a.jsxs)(n.CardHeader,{children:[(0,a.jsx)(n.CardTitle,{children:"Configure Timetable"}),(0,a.jsx)(n.CardDescription,{children:"Select a class to set exam dates and times for each subject."})]}),(0,a.jsxs)(n.CardContent,{className:"space-y-6",children:[(0,a.jsxs)("div",{className:"flex items-center gap-4",children:[(0,a.jsx)(c.Label,{children:"Select Class:"}),(0,a.jsxs)(m.Select,{value:$,onValueChange:z,children:[(0,a.jsx)(m.SelectTrigger,{className:"w-[200px] bg-white/5 border-white/10",children:(0,a.jsx)(m.SelectValue,{placeholder:"Choose Class"})}),(0,a.jsx)(m.SelectContent,{children:P.map(e=>(0,a.jsx)(m.SelectItem,{value:e.id,children:e.name},e.id))})]}),$&&(0,a.jsxs)(r.Button,{onClick:U,disabled:L,className:"bg-emerald-600 hover:bg-emerald-700 text-white ml-auto",children:[L?(0,a.jsx)(h.Loader2,{className:"animate-spin"}):(0,a.jsx)(x.Save,{className:"w-4 h-4 mr-2"}),"Save Timetable"]})]}),$&&(0,a.jsxs)("div",{className:"space-y-4",children:[(0,a.jsx)("div",{className:"md:hidden space-y-3",children:M.map(e=>{let t=H[e.id]||{enabled:!1};return(0,a.jsxs)("div",{className:(0,C.cn)("bg-black/20 border border-white/10 rounded-2xl p-4 space-y-4 backdrop-blur-md transition-all",t.enabled?"ring-1 ring-emerald-500/30":"opacity-60"),children:[(0,a.jsxs)("div",{className:"flex items-center justify-between",children:[(0,a.jsxs)("div",{className:"flex items-center gap-3",children:[(0,a.jsx)("div",{className:"flex items-center",children:(0,a.jsx)("input",{type:"checkbox",checked:!!t.enabled,onChange:a=>V(e.id,"enabled",a.target.checked),className:"w-5 h-5 rounded border-white/20 bg-black/40 accent-emerald-500"})}),(0,a.jsx)("span",{className:"font-bold text-sm text-white",children:e.name})]}),(0,a.jsx)(u.Badge,{variant:t.enabled?"default":"outline",className:(0,C.cn)("text-[8px] font-black uppercase tracking-tighter py-0 h-4",t.enabled?"bg-emerald-500/10 text-emerald-400 border-none":"text-white/20"),children:t.enabled?"Included":"Excluded"})]}),t.enabled&&(0,a.jsxs)("div",{className:"grid grid-cols-1 gap-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-300",children:[(0,a.jsxs)("div",{className:"space-y-1.5 font-mono",children:[(0,a.jsxs)("label",{className:"text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5",children:[(0,a.jsx)(g.Calendar,{className:"w-3 h-3"})," Exam Date"]}),(0,a.jsx)(o.Input,{type:"date",value:t.date||"",onChange:a=>V(e.id,"date",a.target.value),className:"h-10 bg-white/5 border-white/10 w-full text-xs",min:D.startDate,max:D.endDate})]}),(0,a.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,a.jsxs)("div",{className:"space-y-1.5 font-mono",children:[(0,a.jsxs)("label",{className:"text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5",children:[(0,a.jsx)(v.Clock,{className:"w-3 h-3"})," Start"]}),(0,a.jsx)(o.Input,{type:"time",value:t.startTime||"",onChange:a=>V(e.id,"startTime",a.target.value),className:"h-10 bg-white/5 border-white/10 w-full text-xs"})]}),(0,a.jsxs)("div",{className:"space-y-1.5 font-mono",children:[(0,a.jsxs)("label",{className:"text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5",children:[(0,a.jsx)(v.Clock,{className:"w-3 h-3"})," End"]}),(0,a.jsx)(o.Input,{type:"time",value:t.endTime||"",onChange:a=>V(e.id,"endTime",a.target.value),className:"h-10 bg-white/5 border-white/10 w-full text-xs"})]})]})]})]},e.id)})}),(0,a.jsx)("div",{className:"hidden md:block border border-white/10 rounded-lg overflow-x-auto",children:(0,a.jsxs)("table",{className:"w-full text-sm min-w-[700px]",children:[(0,a.jsx)("thead",{className:"bg-white/5",children:(0,a.jsxs)("tr",{children:[(0,a.jsx)("th",{className:"p-3 text-left w-10",children:"Include"}),(0,a.jsx)("th",{className:"p-3 text-left",children:"Subject"}),(0,a.jsx)("th",{className:"p-3 text-left",children:"Date"}),(0,a.jsx)("th",{className:"p-3 text-left",children:"Start Time"}),(0,a.jsx)("th",{className:"p-3 text-left",children:"End Time"})]})}),(0,a.jsx)("tbody",{className:"divide-y divide-white/5",children:M.map(e=>{let t=H[e.id]||{enabled:!1};return(0,a.jsxs)("tr",{className:t.enabled?"bg-white/[0.02]":"opacity-50",children:[(0,a.jsx)("td",{className:"p-3",children:(0,a.jsx)("input",{type:"checkbox",checked:!!t.enabled,onChange:a=>V(e.id,"enabled",a.target.checked),className:"w-4 h-4 rounded border-white/20 bg-black/40"})}),(0,a.jsx)("td",{className:"p-3 font-medium",children:e.name}),(0,a.jsx)("td",{className:"p-3",children:(0,a.jsx)(o.Input,{type:"date",value:t.date||"",onChange:a=>V(e.id,"date",a.target.value),className:"h-8 bg-black/20 border-white/10 w-40",disabled:!t.enabled,min:D.startDate,max:D.endDate})}),(0,a.jsx)("td",{className:"p-3",children:(0,a.jsx)(o.Input,{type:"time",value:t.startTime||"",onChange:a=>V(e.id,"startTime",a.target.value),className:"h-8 bg-black/20 border-white/10 w-32",disabled:!t.enabled})}),(0,a.jsx)("td",{className:"p-3",children:(0,a.jsx)(o.Input,{type:"time",value:t.endTime||"",onChange:a=>V(e.id,"endTime",a.target.value),className:"h-8 bg-black/20 border-white/10 w-32",disabled:!t.enabled})})]},e.id)})})]})})]})]})]})}),(0,a.jsx)(p.TabsContent,{value:"documents",children:(0,a.jsxs)(n.Card,{className:"bg-black/20 border-white/10",children:[(0,a.jsxs)(n.CardHeader,{children:[(0,a.jsx)(n.CardTitle,{children:"Generate Documents"}),(0,a.jsx)(n.CardDescription,{children:"Select a class to generate hall tickets or final report cards."})]}),(0,a.jsxs)(n.CardContent,{className:"space-y-6",children:[(0,a.jsxs)("div",{className:"flex flex-col md:flex-row md:items-center gap-4",children:[(0,a.jsxs)("div",{className:"flex items-center gap-4 flex-1",children:[(0,a.jsx)(c.Label,{className:"shrink-0",children:"Select Class:"}),(0,a.jsxs)(m.Select,{value:$,onValueChange:z,children:[(0,a.jsx)(m.SelectTrigger,{className:"w-full md:w-[200px] bg-white/5 border-white/10",children:(0,a.jsx)(m.SelectValue,{placeholder:"Choose Class"})}),(0,a.jsx)(m.SelectContent,{children:P.map(e=>(0,a.jsx)(m.SelectItem,{value:e.id,children:e.name},e.id))})]})]}),$&&(0,a.jsxs)("div",{className:"flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto",children:[(0,a.jsx)("div",{className:"w-full sm:w-auto",children:(0,a.jsx)(y,{exam:D,classId:$})}),(0,a.jsxs)(r.Button,{onClick:()=>{window.open(`/admin/exams/${j}/print/${$}`,"_blank")},className:"w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11",children:[(0,a.jsx)(f.Printer,{className:"w-4 h-4"})," Print Hall Tickets"]})]})]}),(0,a.jsxs)("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-emerald-300 text-sm",children:[(0,a.jsxs)("h4",{className:"font-bold flex items-center mb-2",children:[(0,a.jsx)(w.FileText,{className:"w-4 h-4 mr-2"})," Printing Instructions"]}),(0,a.jsxs)("ul",{className:"list-disc list-inside space-y-1",children:[(0,a.jsx)("li",{children:"Ensure the timetable is configured for the selected class before printing."}),(0,a.jsxs)("li",{children:["Hall tickets will be generated for all ",(0,a.jsx)("b",{children:"ACTIVE"})," students in the class."]}),(0,a.jsx)("li",{children:'The print view will open in a new tab. Use browser print (Ctrl+P) setting "Background Graphics" ON.'})]})]})]})]})})]})]}):null}e.s(["default",()=>S],70354)}]);