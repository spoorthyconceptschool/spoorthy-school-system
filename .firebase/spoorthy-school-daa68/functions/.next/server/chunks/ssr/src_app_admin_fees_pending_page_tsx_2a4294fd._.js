module.exports=[43160,a=>{"use strict";var b=a.i(87924),c=a.i(72131);a.i(69387);var d=a.i(60574),e=a.i(20237),f=a.i(96221),g=a.i(84505),h=a.i(71931),i=a.i(87532),j=a.i(23312),k=a.i(46842),l=a.i(24987),m=a.i(66384),n=a.i(99570),o=a.i(66718),p=a.i(86304),q=a.i(91410),r=a.i(80701),s=a.i(89402),t=a.i(14574),u=a.i(15055),v=a.i(70430),w=a.i(56025),x=a.i(88110),y=a.i(68114),z=a.i(50944),A=a.i(67453),B=a.i(50522),C=a.i(4720);function D({students:a}){let[g,i]=(0,c.useState)(!1),[j,k]=(0,c.useState)(!1),[l,m]=(0,c.useState)([]),[o,p]=(0,c.useState)([]),[r,s]=(0,c.useState)("SELECT"),{branding:v}=(0,q.useMasterData)(),w=Array.from(new Set(a.map(a=>a.className))).filter(Boolean).sort();(0,c.useEffect)(()=>{g&&(p(w),s("SELECT"),m([]))},[g]);let x=a=>{p(b=>b.includes(a)?b.filter(b=>b!==a):[...b,a])},y=async()=>{if(0===o.length)return void alert("Please select at least one class");k(!0);try{let b=(0,d.collection)(e.db,"student_fee_ledgers"),c=(0,d.query)(b,(0,d.where)("academicYearId","==","2025-2026")),f=await (0,d.getDocs)(c),g={};f.forEach(a=>g[a.data().studentId]=a.data());let h=new Date().toISOString().split("T")[0],i=a.filter(a=>o.includes(a.className)).map(a=>{let b=g[a.schoolId];if(!b)return null;let c=(b.items||[]).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||"")),d=c.filter(a=>"TERM"===a.type),e=c.filter(a=>"TRANSPORT"===a.type),f=c.filter(a=>"CUSTOM"===a.type),i=b.totalPaid||0,j=d.find(a=>a.dueDate>=h)||d[d.length-1],k=[];d.forEach(a=>{let b=a.amount||0,c=Math.min(b,i),d=b-c;i-=c,d>0&&k.push({name:a.name,total:b,pending:d,dueDate:a.dueDate})});let l=0;e.forEach(a=>{let b=Math.min(a.amount||0,i);l+=(a.amount||0)-b,i-=b});let m=0;f.forEach(a=>{let b=Math.min(a.amount||0,i);m+=(a.amount||0)-b,i-=b});let n=j?.dueDate||"",o=k.filter(a=>a.dueDate<=n);if(0===o.length&&l<=0&&m<=0)return null;let p=o.reduce((a,b)=>a+b.pending,0)+l+m;return{name:a.studentName,id:a.schoolId,class:a.className,section:a.sectionName,totalFee:b.totalFee||0,totalPending:p,pendingTerms:o,busPending:l,customPending:m,printDate:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}}).filter(Boolean);m(i),s("PREVIEW")}catch(a){console.error(a),alert("Failed to load fee data")}finally{k(!1)}};return(0,b.jsxs)(t.Dialog,{open:g,onOpenChange:i,children:[(0,b.jsx)(t.DialogTrigger,{asChild:!0,children:(0,b.jsxs)(n.Button,{variant:"outline",className:"h-11 gap-2 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 rounded-xl px-4 md:px-6 transition-all",children:[(0,b.jsx)(C.FileText,{className:"w-4 h-4"})," ",(0,b.jsx)("span",{className:"hidden sm:inline",children:"Fee Slips"}),(0,b.jsx)("span",{className:"sm:hidden",children:"Slips"})]})}),(0,b.jsxs)(t.DialogContent,{className:"bg-black/95 border-white/10 text-white max-w-lg",children:[(0,b.jsx)(t.DialogHeader,{children:(0,b.jsxs)(t.DialogTitle,{className:"flex items-center gap-2",children:[(0,b.jsx)(h.Printer,{className:"w-5 h-5 text-amber-500"}),"Generate Fee Slips"]})}),(0,b.jsxs)("div",{className:"py-2",children:["SELECT"===r&&(0,b.jsxs)("div",{className:"space-y-4",children:[(0,b.jsx)("div",{className:"bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-xs text-amber-200/70",children:"Select the classes you want to generate slips for. Only students with pending term fees will be included."}),(0,b.jsxs)("div",{className:"flex justify-between items-center px-1",children:[(0,b.jsx)("span",{className:"text-sm font-medium text-muted-foreground uppercase tracking-wider",children:"Available Classes"}),(0,b.jsxs)("div",{className:"flex gap-4",children:[(0,b.jsx)(n.Button,{variant:"link",className:"text-amber-500 h-auto p-0 text-xs",onClick:()=>p(w),children:"Select All"}),(0,b.jsx)(n.Button,{variant:"link",className:"text-white/40 hover:text-white h-auto p-0 text-xs",onClick:()=>p([]),children:"Clear All"})]})]}),(0,b.jsx)("div",{className:"grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1 pr-2",children:w.map(a=>(0,b.jsxs)("div",{className:`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${o.includes(a)?"bg-amber-500/10 border-amber-500/30 text-white":"bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"}`,onClick:()=>x(a),children:[(0,b.jsx)(u.Checkbox,{id:`class-${a}`,checked:o.includes(a),onCheckedChange:()=>x(a),className:"border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"}),(0,b.jsx)("label",{htmlFor:`class-${a}`,className:"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",children:a})]},a))}),(0,b.jsxs)(n.Button,{className:"w-full h-12 bg-amber-500 text-black hover:bg-amber-600 font-bold gap-2 mt-4",onClick:y,disabled:j||0===o.length,children:[j?(0,b.jsx)(f.Loader2,{className:"w-5 h-5 animate-spin"}):(0,b.jsx)(B.ChevronRight,{className:"w-5 h-5"}),j?"Analyzing Data...":`Proceed with ${o.length} Classes`]})]}),"PREVIEW"===r&&(0,b.jsxs)("div",{className:"space-y-6",children:[(0,b.jsxs)("div",{className:"p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-4",children:[(0,b.jsx)("div",{className:"bg-green-500 p-2 rounded-full text-black",children:(0,b.jsx)(A.CheckCircle2,{className:"w-6 h-6"})}),(0,b.jsxs)("div",{children:[(0,b.jsxs)("p",{className:"font-bold text-lg",children:[l.length," Slips Prepared"]}),(0,b.jsx)("p",{className:"text-xs text-muted-foreground",children:"Automatically grouped by class for easy sorting."})]})]}),(0,b.jsxs)("div",{className:"bg-white/5 border border-white/10 rounded-lg p-2 max-h-[200px] overflow-y-auto",children:[l.slice(0,5).map(a=>(0,b.jsxs)("div",{className:"flex justify-between items-center p-2 border-b border-white/5 last:border-0 text-xs text-muted-foreground",children:[(0,b.jsxs)("div",{className:"flex flex-col",children:[(0,b.jsx)("span",{className:"text-white font-medium",children:a.name}),(0,b.jsx)("span",{className:"text-[10px]",children:a.class})]}),(0,b.jsxs)("span",{className:"text-amber-500 font-mono",children:["₹",a.totalPending]})]},a.id)),l.length>5&&(0,b.jsxs)("p",{className:"text-center py-2 text-[10px] text-muted-foreground italic",children:["And ",l.length-5," others..."]})]}),(0,b.jsxs)("div",{className:"flex gap-3 pt-4",children:[(0,b.jsxs)(n.Button,{className:"flex-1 bg-white text-black hover:bg-white/90 font-bold h-12 gap-2 text-lg",onClick:()=>{let a=window.open("","_blank");if(!a)return;let b={};l.forEach(a=>{b[a.class]||(b[a.class]=[]),b[a.class].push(a)});let c=`
            <html>
            <head>
                <title>Fee Slips</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: sans-serif; margin: 0; padding: 0; background: #fff; line-height: 1.1; }
                    .slips-container { 
                        display: grid; 
                        grid-template-columns: 1fr 1fr; 
                        grid-template-rows: auto repeat(5, 1fr); 
                        gap: 1.5mm; 
                        height: 297mm;
                        width: 210mm;
                        padding: 4mm 6mm;
                        box-sizing: border-box;
                        page-break-after: always;
                    }
                    .slip { 
                        border: 2pt solid #000;
                        padding: 2mm; 
                        display: flex; 
                        flex-direction: column; 
                        justify-content: flex-start;
                        font-size: 8.5px;
                        overflow: hidden;
                        height: 100%;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .header { text-align: center; border-bottom: 2pt solid #000; margin-bottom: 1mm; padding-bottom: 0.5mm; display: flex; align-items: center; justify-content: center; gap: 5mm; }
                    .school-name { font-weight: 900; font-size: 11px; text-transform: uppercase; }
                    .logo-mini { height: 25px; width: auto; object-fit: contain; }
                    .title { font-size: 8px; font-weight: bold; background: #000; color: #fff; padding: 1px 4px; display: inline-block; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 0.5mm; }
                    .label { color: #000; font-weight: bold; }
                    .value { font-weight: bold; }
                    
                    .fee-table { width: 100%; border-collapse: collapse; margin-top: 1mm; }
                    .fee-table th, .fee-table td { border: 0.5pt solid #000; padding: 0.3mm 1mm; text-align: left; font-size: 7.5px; }
                    .fee-table th { background: #f0f0f0; font-weight: bold; }
                    .fee-table td.amount { text-align: right; font-weight: 800; }
                    
                    .total-box-horizontal { 
                        border: 1.5pt solid #000; 
                        padding: 1mm 2mm; 
                        margin-top: 1.5mm; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        background: #000;
                        color: #fff;
                    }
                    .total-label { font-size: 9px; font-weight: 900; letter-spacing: 0.5px; }
                    .total-value { font-size: 11px; font-weight: 900; }
                    .footer { text-align: center; font-size: 7px; color: #000; margin-top: auto; padding-top: 1mm; border-top: 0.5pt dashed #ccc; }
                    .class-header { 
                        grid-column: span 2; 
                        text-align: center; 
                        font-weight: 900; 
                        font-size: 10px; 
                        color: #000; 
                        border-bottom: 1.5pt solid #000;
                        margin-bottom: 1.5mm;
                        padding: 0.5mm;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                    }
                </style>
            </head>
            <body>
                ${Object.entries(b).map(([a,b])=>{let c=[];for(let a=0;a<b.length;a+=10)c.push(b.slice(a,a+10));return c.map(b=>`
                        <div class="slips-container">
                            <div class="class-header">CLASS: ${a}</div>
                            ${b.map(a=>`
                                <div class="slip">
                                    <div class="header">
                                        ${v?.schoolLogo?`<img src="${v.schoolLogo}" class="logo-mini" />`:""}
                                        <div>
                                            <div class="school-name">${v?.schoolName}</div>
                                            <div class="title">FEE REMINDER SLIP</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <span class="label">Student:</span>
                                        <span class="value">${a.name.toUpperCase()}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label">ID / Class:</span>
                                        <span class="value">${a.id} (${a.class}) ${a.section?`- ${a.section}`:""}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label">Print Date:</span>
                                        <span class="value">${a.printDate}</span>
                                    </div>
                                    
                                    <div style="margin: 0.5mm 0; border-top: 1pt solid #000;"></div>
                                    
                                    <table class="fee-table">
                                        <thead>
                                            <tr>
                                                <th>Fee Particulars</th>
                                                <th style="text-align:right">Pending Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(a.pendingTerms||[]).map(a=>`
                                                <tr>
                                                    <td>${a.name}</td>
                                                    <td class="amount" style="color:#d32f2f">₹${a.pending}</td>
                                                </tr>
                                            `).join("")}
                                            ${a.busPending>0?`
                                                <tr>
                                                    <td>Transport Fee</td>
                                                    <td class="amount">₹${a.busPending}</td>
                                                </tr>
                                            `:""}
                                            ${a.customPending>0?`
                                                <tr>
                                                    <td>Other Fees</td>
                                                    <td class="amount">₹${a.customPending}</td>
                                                </tr>
                                            `:""}
                                        </tbody>
                                    </table>

                                    <div class="total-box-horizontal">
                                        <span class="total-label">PLEASE PAY TOTAL:</span>
                                        <span class="total-value">₹${a.totalPending}</span>
                                    </div>
                                    
                                    <div class="footer">Kindly clear the dues at office. Thank you.</div>
                                </div>
                            `).join("")}
                        </div>
                    `).join("")}).join("")}
                <script>
                    window.onload = () => { window.print(); window.close(); };
                </script>
            </body>
            </html>
        `;a.document.write(c),a.document.close()},children:[(0,b.jsx)(h.Printer,{className:"w-5 h-5"})," Print All Slips"]}),(0,b.jsx)(n.Button,{variant:"ghost",className:"h-12 px-6",onClick:()=>i(!1),children:"Close"})]})]})]})]})]})}function E(){let[a,A]=(0,c.useState)([]),[B,C]=(0,c.useState)(!0),[E,F]=(0,c.useState)(""),[G,H]=(0,c.useState)("all"),[I,J]=(0,c.useState)("all"),K=(0,z.useRouter)(),{user:L}=(0,w.useAuth)(),[M,N]=(0,c.useState)(!1),[O,P]=(0,c.useState)("table"),[Q,R]=(0,c.useState)([]),[S,T]=(0,c.useState)([]),[U,V]=(0,c.useState)(!1),{classes:W,villages:X,branding:Y}=(0,q.useMasterData)(),Z=Object.values(W||{}).map(a=>({id:a.id,name:a.name,order:a.order||99})).sort((a,b)=>a.order-b.order),$=Object.values(X||{}).map(a=>({id:a.id,name:a.name})).sort((a,b)=>a.name.localeCompare(b.name)),_=async()=>{try{let a=(0,d.query)((0,d.collection)(e.db,"student_fee_ledgers"),(0,d.where)("status","==","PENDING")),b=(await (0,d.getDocs)(a)).docs.map(a=>{let b=a.data();return{id:a.id,...b,pendingAmount:(b.totalFee||0)-(b.totalPaid||0)}}).filter(a=>a.pendingAmount>0),c=await (0,d.getDocs)((0,d.collection)(e.db,"students")),f={};c.docs.forEach(a=>{let b=a.data();b.schoolId&&"ACTIVE"===b.status&&(f[b.schoolId]=b)});let g=b.map(a=>{let b=f[a.studentId];if(!b)return null;let c=a.items?.find(a=>"TRANSPORT"===a.type),d=c?.amount||0,e=a.items?.filter(a=>"CUSTOM"===a.type),g=e?.reduce((a,b)=>a+(b.amount||0),0)||0;return{...a,parentName:b.parentName||"N/A",parentMobile:b.parentMobile||"N/A",villageId:b.villageId||"",villageName:b.villageName||"N/A",sectionName:b.sectionName||"",transportFee:d,customFee:g}}).filter(Boolean).sort((a,b)=>b.pendingAmount-a.pendingAmount);A(g)}catch(a){console.error("Fetch Pendings Error:",a)}finally{C(!1)}};(0,c.useEffect)(()=>{_()},[]);let aa=a.filter(a=>{let b=!E||a.studentId?.toLowerCase().includes(E.toLowerCase())||a.studentName?.toLowerCase().includes(E.toLowerCase())||a.parentName?.toLowerCase().includes(E.toLowerCase())||a.parentMobile?.toLowerCase().includes(E.toLowerCase())||a.villageName?.toLowerCase().includes(E.toLowerCase())||a.className?.toLowerCase().includes(E.toLowerCase()),c="all"===G||a.classId===G||a.className===G,d="all"===I||a.villageId===I||a.villageName===I;return b&&c&&d}),ab=async()=>{if("notify"===O){V(!0);try{let a=await L?.getIdToken(),b=await fetch("/api/admin/fees/notify",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${a}`},body:JSON.stringify({selectedClasses:Q,selectedVillages:S})}),c=await b.json();if(c.success)(0,x.toast)({title:"Notifications Sent",description:c.message,type:"success"}),N(!1);else throw Error(c.error||"Failed to send notifications")}catch(a){(0,x.toast)({title:"Error",description:a.message,type:"error"})}finally{V(!1)}return}let b=a.filter(a=>{let b=0===Q.length||Q.includes(a.classId)||Q.includes(a.className),c=0===S.length||S.includes(a.villageId)||S.includes(a.villageName);return b&&c});if("csv"===O){let a,c,d;a=new Blob([[["School ID","Student Name","Parent Name","Mobile","Village","Class","Term Fee","Transport Fee","Custom Fee","Total Fee","Paid","Pending Balance"],...b.map(a=>[a.studentId,a.studentName,a.parentName,a.parentMobile||"",a.villageName,a.className,(a.totalFee||0)-(a.transportFee||0)-(a.customFee||0),a.transportFee||0,a.customFee||0,a.totalFee,a.totalPaid,a.pendingAmount])].map(a=>a.join(",")).join("\n")],{type:"text/csv;charset=utf-8;"}),c=document.createElement("a"),d=URL.createObjectURL(a),c.setAttribute("href",d),c.setAttribute("download",`pending_dues_${new Date().toISOString().split("T")[0]}.csv`),c.style.visibility="hidden",document.body.appendChild(c),c.click(),document.body.removeChild(c),N(!1)}else(a=>{let b=window.open("","_blank");if(!b)return;let c=new Date().toLocaleString(),d=a.reduce((a,b)=>a+(b.pendingAmount||0),0),e=`
                <html>
                <head>
                    <title>Dues Report</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                        th { background-color: #f2f2f2; }
                        h1 { text-align: center; color: #cc0000; margin-bottom: 5px; }
                        .header-meta { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
                        .summary { margin: 20px 0; font-weight: bold; border: 1px solid #ffcccc; padding: 10px; background: #fff5f5; border-radius: 5px; }
                        .branding { display: flex; align-items: center; justify-content: center; gap: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                        .school-info h1 { margin: 0; font-size: 24px; text-align: left; }
                        .school-info p { margin: 2px 0; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="branding">
                        ${Y?.schoolLogo?`<img src="${Y.schoolLogo}" style="height: 60px;" />`:""}
                        <div class="school-info">
                            <h1>${Y?.schoolName}</h1>
                            <p>${Y?.address||""}</p>
                            <p><strong>Pending Dues Report</strong> | ${c}</p>
                        </div>
                    </div>
                    <div class="summary">
                        Total Outstanding: ₹${d.toLocaleString()} | Total Pending Accounts: ${a.length}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Class & Sec</th>
                                <th>Village</th>
                                <th>Parent Name</th>
                                <th>Parent Mobile</th>
                                <th>Transport Fee</th>
                                <th>Custom Fees</th>
                                <th>Total Fee</th>
                                <th>Paid</th>
                                <th style="background: #ffe6e6;">Balance Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${a.map(a=>`
                                <tr>
                                    <td style="font-weight:bold;">${a.studentName}</td>
                                    <td>${a.className} - ${a.sectionName||""}</td>
                                    <td>${a.villageName}</td>
                                    <td>${a.parentName}</td>
                                    <td style="font-weight:bold; color: #1a56db;">${a.parentMobile||""}</td>
                                    <td>₹${(a.transportFee||0).toLocaleString()}</td>
                                    <td>₹${(a.customFee||0).toLocaleString()}</td>
                                    <td>₹${a.totalFee?.toLocaleString()}</td>
                                    <td>₹${a.totalPaid?.toLocaleString()}</td>
                                    <td style="color:red; font-weight:black; font-size: 13px;">₹${a.pendingAmount?.toLocaleString()}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                    <script>
                        window.onload = () => { window.print(); window.close(); };
                    </script>
                </body>
                </html>
            `;b.document.write(e),b.document.close(),N(!1)})(b)},ac=aa.reduce((a,b)=>a+(b.pendingAmount||0),0);return(0,b.jsxs)("div",{className:"space-y-6 animate-in fade-in duration-500 max-w-none p-0 pb-20",children:[(0,b.jsxs)("div",{className:"flex flex-col lg:flex-row lg:items-center lg:justify-between pt-4 gap-6 px-2 md:px-0",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("h1",{className:"text-3xl md:text-5xl font-display font-bold bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent italic leading-tight",children:"Pending Dues"}),(0,b.jsxs)("p",{className:"text-muted-foreground text-sm md:text-lg tracking-tight",children:["Recovering ",(0,b.jsx)("span",{className:"text-white font-bold",children:"outstanding school fees"})]})]}),(0,b.jsxs)("div",{className:"flex flex-wrap items-center gap-2 md:gap-3",children:[(0,b.jsxs)(n.Button,{variant:"destructive",className:"h-11 gap-2 bg-red-600/10 border-red-500/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/10",onClick:()=>{P("notify"),N(!0)},children:[(0,b.jsx)(j.Bell,{size:16})," ",(0,b.jsx)("span",{className:"hidden sm:inline",children:"Bulk Notify"}),(0,b.jsx)("span",{className:"sm:hidden",children:"Notify"})]}),(0,b.jsx)(D,{students:a.map(a=>({schoolId:a.studentId,studentName:a.studentName,className:a.className,sectionName:a.sectionName||""}))}),(0,b.jsxs)(n.Button,{variant:"outline",onClick:()=>{P("table"),N(!0)},className:"h-11 gap-2 border-white/10 bg-white/5 rounded-xl hover:bg-white/10",children:[(0,b.jsx)(h.Printer,{size:16})," ",(0,b.jsx)("span",{className:"hidden sm:inline",children:"Print Dues List"}),(0,b.jsx)("span",{className:"sm:hidden",children:"Print"})]}),(0,b.jsxs)(n.Button,{variant:"outline",onClick:()=>{P("csv"),N(!0)},className:"h-11 gap-2 border-white/10 bg-white/5 rounded-xl hover:bg-white/10",children:[(0,b.jsx)(g.Download,{size:16})," ",(0,b.jsx)("span",{className:"hidden sm:inline",children:"Export CSV"}),(0,b.jsx)("span",{className:"sm:hidden",children:"CSV"})]})]})]}),(0,b.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-4 px-2 md:px-0",children:[(0,b.jsxs)("div",{className:"bg-red-500/5 border border-red-500/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl flex items-center gap-4",children:[(0,b.jsx)("div",{className:"w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center",children:(0,b.jsx)(m.ShieldAlert,{size:24,className:"text-red-400"})}),(0,b.jsxs)("div",{children:[(0,b.jsx)("p",{className:"text-[10px] font-black uppercase tracking-widest text-red-400 mb-0.5 italic",children:"Total Outstanding"}),(0,b.jsxs)("div",{className:"text-3xl font-mono font-black text-white",children:["₹",ac.toLocaleString()]})]})]}),(0,b.jsxs)("div",{className:"bg-orange-500/5 border border-orange-500/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl flex items-center gap-4",children:[(0,b.jsx)("div",{className:"w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center",children:(0,b.jsx)(k.User,{size:24,className:"text-orange-400"})}),(0,b.jsxs)("div",{children:[(0,b.jsx)("p",{className:"text-[10px] font-black uppercase tracking-widest text-orange-400 mb-0.5 italic",children:"Pending Accounts"}),(0,b.jsxs)("div",{className:"text-3xl font-mono font-black text-white",children:[aa.length," ",(0,b.jsx)("span",{className:"text-xs text-orange-400/50",children:"Students"})]})]})]})]}),(0,b.jsxs)("div",{className:"bg-black/20 p-4 md:p-5 rounded-2xl border border-white/10 backdrop-blur-md space-y-4 shadow-2xl mx-2 md:mx-0",children:[(0,b.jsxs)("div",{className:"relative w-full",children:[(0,b.jsx)(i.Search,{className:"absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"}),(0,b.jsx)(o.Input,{placeholder:"Search by student name, parent, or mobile...",className:"pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-accent/30",value:E,onChange:a=>F(a.target.value)})]}),(0,b.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2",children:[(0,b.jsxs)(r.Select,{value:G,onValueChange:H,children:[(0,b.jsx)(r.SelectTrigger,{className:"w-full lg:w-[180px] h-12 bg-white/5 border-white/10 rounded-xl",children:(0,b.jsx)(r.SelectValue,{placeholder:"All Classes"})}),(0,b.jsxs)(r.SelectContent,{className:"bg-zinc-900 border-white/10 text-white",children:[(0,b.jsx)(r.SelectItem,{value:"all",children:"All Classes"}),Z.map(a=>(0,b.jsx)(r.SelectItem,{value:a.id,children:a.name},a.id))]})]}),(0,b.jsxs)(r.Select,{value:I,onValueChange:J,children:[(0,b.jsx)(r.SelectTrigger,{className:"w-full lg:w-[180px] h-12 bg-white/5 border-white/10 rounded-xl",children:(0,b.jsx)(r.SelectValue,{placeholder:"All Villages"})}),(0,b.jsxs)(r.SelectContent,{className:"bg-zinc-900 border-white/10 text-white",children:[(0,b.jsx)(r.SelectItem,{value:"all",children:"All Villages"}),$.map(a=>(0,b.jsx)(r.SelectItem,{value:a.id,children:a.name},a.id))]})]}),("all"!==G||"all"!==I||E)&&(0,b.jsx)(n.Button,{variant:"ghost",size:"sm",onClick:()=>{F(""),H("all"),J("all")},className:"h-12 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-xl border border-dashed border-white/10 transition-all",children:"Clear Filters"})]})]}),(0,b.jsx)(s.DataTable,{data:aa,isLoading:B,onRowClick:a=>K.push(`/admin/students/${a.studentDocId||a.id}`),columns:[{key:"studentName",header:"Student Info",render:a=>(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsx)("div",{className:"w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5",children:(0,b.jsx)(k.User,{size:14,className:"text-white/40"})}),(0,b.jsxs)("div",{className:"flex flex-col",children:[(0,b.jsx)("span",{className:"font-bold text-sm text-white leading-tight group-hover:text-red-400 transition-colors uppercase",children:a.studentName}),(0,b.jsx)("span",{className:"text-[10px] font-mono text-white/40 tracking-tighter uppercase",children:a.studentId})]})]})},{key:"className",header:"Class & Village",render:a=>(0,b.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,b.jsx)("span",{className:"text-[10px] uppercase font-black text-muted-foreground tracking-tighter bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit",children:a.className}),(0,b.jsxs)("div",{className:"flex items-center gap-1 text-[10px] text-white/30",children:[(0,b.jsx)(l.MapPin,{size:10}),(0,b.jsx)("span",{className:"truncate max-w-[120px]",children:a.villageName})]})]})},{key:"totalFee",header:"Total Fee",headerClassName:"text-right",cellClassName:"text-right",render:a=>(0,b.jsxs)("span",{className:"font-mono font-bold text-sm text-white/40 italic",children:["₹",a.totalFee?.toLocaleString()]})},{key:"totalPaid",header:"Paid",headerClassName:"text-right",cellClassName:"text-right",render:a=>(0,b.jsxs)("span",{className:"font-mono font-black text-sm text-emerald-400/60",children:["₹",a.totalPaid?.toLocaleString()]})},{key:"pendingAmount",header:"Balance Due",headerClassName:"text-right",cellClassName:"text-right",render:a=>(0,b.jsxs)("div",{className:"flex flex-col items-end",children:[(0,b.jsxs)("span",{className:"font-mono font-black text-lg text-red-500",children:["₹",a.pendingAmount?.toLocaleString()]}),a.totalPaid>0&&(0,b.jsx)("span",{className:"text-[8px] font-black text-emerald-500/50 uppercase tracking-tighter",children:"Partially Paid"})]})},{key:"parentName",header:"Parent Info",render:a=>(0,b.jsxs)("div",{className:"flex flex-col",children:[(0,b.jsx)("span",{className:"text-sm font-semibold text-white/90",children:a.parentName||"N/A"}),(0,b.jsx)("span",{className:"text-[10px] font-mono text-emerald-400",children:a.parentMobile||"N/A"})]})},{key:"breakdown",header:"Breakdown",render:a=>(0,b.jsxs)("div",{className:"flex flex-col gap-0.5 text-[10px]",children:[(0,b.jsxs)("span",{className:"text-white/40 italic",children:["Transport: ₹",a.transportFee||0]}),(0,b.jsxs)("span",{className:"text-white/40 italic",children:["Custom: ₹",a.customFee||0]})]})},{key:"status",header:"Status",headerClassName:"text-center",cellClassName:"text-center",render:a=>(0,b.jsx)(p.Badge,{variant:"destructive",className:"text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-none bg-red-500/20 text-red-400 hover:bg-red-500/30",children:a.status})}],actions:a=>(0,b.jsx)("div",{className:"flex flex-col gap-1",children:(0,b.jsx)(n.Button,{variant:"ghost",onClick:()=>K.push(`/admin/students/${a.studentDocId||a.id}`),className:"w-full justify-start gap-2 h-9 text-xs font-bold uppercase tracking-tighter text-red-400 hover:text-white hover:bg-red-500/20",children:"Collect Fees"})})}),(0,b.jsx)(t.Dialog,{open:M,onOpenChange:N,children:(0,b.jsxs)(t.DialogContent,{className:"max-w-2xl bg-[#0A192F] border-white/10 text-white shadow-2xl backdrop-blur-3xl rounded-3xl",children:[(0,b.jsx)(t.DialogHeader,{children:(0,b.jsx)(t.DialogTitle,{className:"text-2xl font-display font-bold italic bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent",children:"notify"===O?"Fee Notification Wizard":"Report Configuration"})}),(0,b.jsxs)("div",{className:"space-y-6 py-4",children:["notify"===O&&(0,b.jsxs)("div",{className:"p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] text-red-200/80 leading-relaxed italic",children:[(0,b.jsx)("strong",{className:"text-red-400 block mb-1",children:"Warning:"}),"Bulk notifications will be sent to parents of students with outstanding dues in the selected categories. This action is tracked in the system audit logs."]}),(0,b.jsxs)("div",{className:"grid grid-cols-2 gap-8",children:[(0,b.jsxs)("div",{className:"space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5",children:[(0,b.jsx)(v.Label,{className:"text-[10px] font-black uppercase tracking-widest text-emerald-400",children:"Target Classes"}),(0,b.jsxs)("div",{className:"max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar",children:[(0,b.jsxs)("div",{className:"flex items-center gap-3 pb-2 border-b border-white/5",children:[(0,b.jsx)(u.Checkbox,{id:"all-classes",className:"border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",checked:0===Q.length,onCheckedChange:a=>a?R([]):null}),(0,b.jsx)(v.Label,{htmlFor:"all-classes",className:"text-sm font-bold opacity-80 cursor-pointer",children:"All Classes"})]}),Z.map(a=>(0,b.jsxs)("div",{className:"flex items-center gap-3 py-1",children:[(0,b.jsx)(u.Checkbox,{id:`class-${a.id}`,className:"border-white/10 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",checked:Q.includes(a.id),onCheckedChange:b=>{b?R([...Q,a.id]):R(Q.filter(b=>b!==a.id))}}),(0,b.jsx)(v.Label,{htmlFor:`class-${a.id}`,className:"text-xs font-medium opacity-60 cursor-pointer hover:opacity-100 transition-opacity",children:a.name})]},a.id))]})]}),(0,b.jsxs)("div",{className:"space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5",children:[(0,b.jsx)(v.Label,{className:"text-[10px] font-black uppercase tracking-widest text-cyan-400",children:"Target Villages"}),(0,b.jsxs)("div",{className:"max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar",children:[(0,b.jsxs)("div",{className:"flex items-center gap-3 pb-2 border-b border-white/5",children:[(0,b.jsx)(u.Checkbox,{id:"all-villages",className:"border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500",checked:0===S.length,onCheckedChange:a=>a?T([]):null}),(0,b.jsx)(v.Label,{htmlFor:"all-villages",className:"text-sm font-bold opacity-80 cursor-pointer",children:"All Villages"})]}),$.map(a=>(0,b.jsxs)("div",{className:"flex items-center gap-3 py-1",children:[(0,b.jsx)(u.Checkbox,{id:`village-${a.id}`,className:"border-white/10 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500",checked:S.includes(a.id),onCheckedChange:b=>{b?T([...S,a.id]):T(S.filter(b=>b!==a.id))}}),(0,b.jsx)(v.Label,{htmlFor:`village-${a.id}`,className:"text-xs font-medium opacity-60 cursor-pointer hover:opacity-100 transition-opacity",children:a.name})]},a.id))]})]})]})]}),(0,b.jsxs)(t.DialogFooter,{className:"gap-2",children:[(0,b.jsx)(n.Button,{variant:"ghost",onClick:()=>N(!1),className:"rounded-xl hover:bg-white/5",children:"Cancel"}),(0,b.jsxs)(n.Button,{className:(0,y.cn)("text-white font-black uppercase tracking-tighter gap-2 rounded-xl border-none shadow-lg transition-all","notify"===O?"bg-red-600 hover:bg-red-500 shadow-red-500/20":"bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-500/20"),onClick:ab,disabled:U,children:[U?(0,b.jsx)(f.Loader2,{className:"animate-spin",size:16}):"csv"===O?(0,b.jsx)(g.Download,{size:16}):"notify"===O?(0,b.jsx)(j.Bell,{size:16}):(0,b.jsx)(h.Printer,{size:16}),"notify"===O?"Dispatch Notifications":"Generate Dataset"]})]})]})})]})}a.s(["default",()=>E],43160)}];

//# sourceMappingURL=src_app_admin_fees_pending_page_tsx_2a4294fd._.js.map