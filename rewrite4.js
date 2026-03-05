const fs = require('fs');
const path = 'src/components/admin/coverage-manager.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('useMemo')) {
    content = content.replace(/useState, useEffect/g, 'useState, useEffect, useMemo');
}

if (!content.includes('leaveRequestId?: string')) {
    content = content.replace(
        `originalTeacherId: string;`,
        `originalTeacherId: string;\n    leaveRequestId?: string;`
    );
}

const renderStartIdx = content.indexOf(`    return (`);

const hookInsertion = `

    const groupedTasks = useMemo(() => {
        const groups: Record<string, CoverageTask[]> = {};
        tasks.forEach(task => {
            const key = task.leaveRequestId || task.originalTeacherId;
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        
        return Object.values(groups).sort((a, b) => {
            const dateA = a[0]?.date || "";
            const dateB = b[0]?.date || "";
            return dateA.localeCompare(dateB);
        });
    }, [tasks]);

    const handleApproveAllGroup = async (group: CoverageTask[]) => {
        setResolving(true);
        let hasError = false;
        try {
            const pendingTasks = group.filter(t => t.status === "PENDING" && t.suggestedType);
            for (const task of pendingTasks) {
                const res = await fetch("/api/admin/timetable/coverage/resolve", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "authorization": \`Bearer \${await auth.currentUser?.getIdToken()}\`
                    },
                    body: JSON.stringify({
                        taskId: task.id,
                        resolutionType: task.suggestedType,
                        substituteTeacherId: task.suggestedType === "SUBSTITUTE" ? task.suggestedSubstituteId : null
                    })
                });
                const data = await res.json();
                if (!data.success) {
                    hasError = true;
                }
            }
        } catch (e) {
            hasError = true;
        }
        
        setResolving(false);
        if (hasError) {
            alert("Some periods could not be automatically approved.");
        }
    };

`;

if (!content.includes('const groupedTasks = useMemo')) {
    content = content.substring(0, renderStartIdx) + hookInsertion + content.substring(renderStartIdx);
}

// Now replace from `{tasks.filter(t => showResolved` to the end of the `)}` list mapping in the grid.
const targetStart = `{tasks.filter(t => showResolved ? t.status === "RESOLVED" : t.status === "PENDING").length === 0 ? (`;
const targetEnd = `                            })
                    )}
                </div>`;

const sIdx = content.indexOf(targetStart);
const eIdxRaw = content.indexOf(targetEnd);

if (sIdx === -1 || eIdxRaw === -1) {
    console.error('Target not found', sIdx, eIdxRaw);
    process.exit(1);
}

const eIdx = eIdxRaw + targetEnd.length;

const newMapping = `{groupedTasks.filter(group => group.some(t => showResolved ? t.status === "RESOLVED" : t.status === "PENDING")).length === 0 ? (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                            <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground">No {showResolved ? "resolved" : "pending"} coverage tasks {showResolved ? "yet" : "at the moment"}.</p>
                        </div>
                    ) : (
                        groupedTasks.filter(group => group.some(t => showResolved ? t.status === "RESOLVED" : t.status === "PENDING")).map((group, groupIndex) => {
                            const firstTask = group[0];
                            const teacherId = firstTask.originalTeacherId;

                            // Sort inner periods
                            const sortedTasks = [...group].sort((a, b) => {
                                if (a.date === b.date) return a.slotId - b.slotId;
                                return (a.date || "").localeCompare(b.date || "");
                            });

                            const dates = Array.from(new Set(group.map(t => t.date))).filter(Boolean).sort();
                            let dateRangeStr = "";
                            if (dates.length > 0) {
                                dateRangeStr = dates.length > 1
                                    ? \`\${dates[0].split('-').slice(1).join('/')} to \${dates[dates.length - 1].split('-').slice(1).join('/')}\`
                                    : \`\${dates[0].split('-').slice(1).join('/')}\`;
                            }

                            return (
                                <Card key={firstTask.leaveRequestId || teacherId + groupIndex} className="bg-black/20 border-white/10 overflow-hidden hover:bg-white/5 transition-all group backdrop-blur-md rounded-2xl relative">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                                                <UserPlus className="w-5 h-5 md:w-6 md:h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm md:text-lg text-white group-hover:text-accent transition-colors leading-tight truncate">
                                                    {getTeacherName(teacherId)}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-0.5 flex-wrap uppercase tracking-widest font-bold">
                                                    {dates.length > 0 && <span className="mr-2 px-2 py-0.5 rounded-md bg-white/10">{dateRangeStr}</span>}
                                                    <span>{group.length} period(s)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5 border-l md:pl-4">
                                            <div className="flex flex-col text-left md:text-right md:border-r border-white/10 md:pr-6 md:mr-2">
                                                <span className="text-[8px] text-blue-400 uppercase font-black tracking-widest mb-0.5">Coverage</span>
                                                <span className="text-xs font-bold text-white/90 truncate max-w-[200px]">
                                                    {Array.from(new Set(group.map(t => {
                                                        if (t.status === "RESOLVED") return t.resolution?.type === "LEISURE" ? "Leisure" : getTeacherName(t.resolution?.substituteTeacherId || "");
                                                        return t.suggestedType === "LEISURE" ? "Leisure" : getTeacherName(t.suggestedSubstituteId || "");
                                                    }))).filter(Boolean).join(", ")}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto">
                                                {!showResolved && group.some(t => t.status === "PENDING" && t.suggestedType) && (
                                                    <Button 
                                                        onClick={() => handleApproveAllGroup(group)}
                                                        disabled={resolving}
                                                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-accent text-black hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all w-full md:w-auto shrink-0"
                                                    >
                                                        {resolving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CheckCircle className="w-3 h-3 mr-2" />}
                                                        Approve All
                                                    </Button>
                                                )}

                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all w-full md:w-auto shrink-0"
                                                        >
                                                            {showResolved ? "Details" : "Manage"}
                                                        </Button>
                                                    </DialogTrigger>
                                                    
                                                    <DialogContent className="bg-[#0A192F] border-white/10 text-white rounded-2xl shadow-2xl shadow-black/50 w-[95vw] md:w-full max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                                                        <DialogHeader className="p-6 border-b border-white/5 shrink-0 bg-black/20">
                                                            <DialogTitle className="text-xl font-bold flex items-center gap-2 italic">
                                                                <UserPlus className="text-accent" /> {showResolved ? "Coverage Details" : "Manage Coverage"}
                                                            </DialogTitle>
                                                            <DialogDescription className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                                                                Periods for {getTeacherName(teacherId)} ({dateRangeStr})
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        <div className="p-4 overflow-y-auto space-y-3">
                                                            {sortedTasks.map(task => {
                                                                const displayDay = task.day || (task.date ? new Date(task.date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() : "N/A");
                                                                const shortDate = task.date?.split('-')?.[1] + "/" + task.date?.split('-')?.[2] || "??/??";

                                                                return (
                                                                    <div key={task.id} className="flex flex-col items-start md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-xl gap-4">
                                                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                                                            <div className="hidden md:flex w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 items-center justify-center text-red-400 font-black text-[10px] flex-col shrink-0 italic shadow-inner">
                                                                                <span>{shortDate}</span>
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                                                                                    <span className="text-accent/80">{displayDay}</span>
                                                                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                                                                    <span className="text-white">Period {task.slotId}</span>
                                                                                </div>
                                                                                <div className="text-sm font-bold text-white/80 truncate">{task.classId}</div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center justify-end w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                                                                            {task.status === "PENDING" && task.suggestedSubstituteId && (
                                                                                <div className="text-right mr-2 md:border-r border-white/10 md:pr-4">
                                                                                    <div className="text-[8px] text-blue-400 uppercase font-black tracking-widest mb-0.5">Recommendation</div>
                                                                                    <div className="text-xs font-bold text-white/90">
                                                                                        {task.suggestedType === "LEISURE" ? "Leisure" : getTeacherName(task.suggestedSubstituteId)}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {task.status === "RESOLVED" && (
                                                                                <div className="text-right mr-2 md:border-r border-white/10 md:pr-4">
                                                                                    <div className="text-[8px] text-emerald-400 uppercase font-black tracking-widest mb-0.5 opacity-40">Resolved Status</div>
                                                                                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                                                        <CheckCircle className="w-3 h-3 shrink-0" />
                                                                                        <span className="truncate">{task.resolution?.type === "LEISURE" ? "Leisure" : \`Covered By \${getTeacherName(task.resolution?.substituteTeacherId || "")}\`}</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            <Dialog open={selectedTask?.id === task.id} onOpenChange={(o) => {
                                                                                if (!o) setSelectedTask(null);
                                                                            }}>
                                                                                <DialogTrigger asChild>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        onClick={() => {
                                                                                            setSelectedTask(task);
                                                                                            if (task.status === "RESOLVED" && task.resolution) {
                                                                                                setResolveType(task.resolution.type === "SUBSTITUTION" ? "SUBSTITUTE" : "LEISURE");
                                                                                                setSubstituteId(task.resolution.substituteTeacherId || "");
                                                                                            } else {
                                                                                                setResolveType((task.suggestedType as any) || "SUBSTITUTE");
                                                                                                setSubstituteId(task.suggestedSubstituteId || "");
                                                                                            }
                                                                                        }}
                                                                                        className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shrink-0 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
                                                                                    >
                                                                                        {task.status === "RESOLVED" ? "Manage" : "Action"}
                                                                                    </Button>
                                                                                </DialogTrigger>
                                                                                
                                                                                <DialogContent className="bg-[#0A192F] border-white/10 text-white rounded-2xl shadow-2xl shadow-black/50 w-[95vw] md:w-full max-w-sm border-l-4 border-l-accent overflow-hidden">
                                                                                    <DialogHeader className="bg-black/20 p-4 border-b border-white/5">
                                                                                        <DialogTitle className="text-lg font-bold flex items-center gap-2 italic">
                                                                                            <UserPlus className="text-accent" /> Resolve Period {task.slotId}
                                                                                        </DialogTitle>
                                                                                    </DialogHeader>

                                                                                    <div className="space-y-4 py-3 p-4">
                                                                                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                                                                                            <Button
                                                                                                variant={resolveType === "SUBSTITUTE" ? "default" : "outline"}
                                                                                                onClick={() => setResolveType("SUBSTITUTE")}
                                                                                                className={cn(
                                                                                                    "flex-1 h-9 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                                                                    resolveType === 'SUBSTITUTE' ? 'bg-accent text-black hover:bg-accent/90' : 'bg-transparent text-white/40 border-none hover:text-white hover:bg-white/5'
                                                                                                )}
                                                                                            >
                                                                                                <UserPlus className="w-3.5 h-3.5 mr-2" /> Substitute
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant={resolveType === "LEISURE" ? "default" : "outline"}
                                                                                                onClick={() => setResolveType("LEISURE")}
                                                                                                className={cn(
                                                                                                    "flex-1 h-9 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                                                                    resolveType === 'LEISURE' ? 'bg-accent text-black hover:bg-accent/90' : 'bg-transparent text-white/40 border-none hover:text-white hover:bg-white/5'
                                                                                                )}
                                                                                            >
                                                                                                <Coffee className="w-3.5 h-3.5 mr-2" /> Leisure
                                                                                            </Button>
                                                                                        </div>

                                                                                        {resolveType === "SUBSTITUTE" && (
                                                                                            <div className="space-y-3 pt-1">
                                                                                                <Select value={substituteId} onValueChange={setSubstituteId}>
                                                                                                    <SelectTrigger className="h-10 bg-black/40 border-white/10 rounded-xl font-bold focus:ring-accent/20">
                                                                                                        <SelectValue placeholder="Choose Teacher" />
                                                                                                    </SelectTrigger>
                                                                                                    <SelectContent className="bg-[#0A192F] border-white/10 text-white max-h-[200px]">
                                                                                                        {teachers
                                                                                                            .filter(t => (t.schoolId || t.id) !== task.originalTeacherId)
                                                                                                            .map(t => (
                                                                                                                <SelectItem key={t.id} value={t.schoolId || t.id} className="focus:bg-accent focus:text-black font-bold text-xs">{t.name}</SelectItem>
                                                                                                            ))}
                                                                                                    </SelectContent>
                                                                                                </Select>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    <DialogFooter className="p-4 bg-black/20 border-t border-white/5">
                                                                                        <Button onClick={handleResolve} disabled={resolving || (resolveType === "SUBSTITUTE" && !substituteId)} className="w-full h-10 bg-accent text-black hover:bg-accent/90 font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-accent/20">
                                                                                            {resolving ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Changes"}
                                                                                        </Button>
                                                                                    </DialogFooter>
                                                                                </DialogContent>
                                                                            </Dialog>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })
                    )}
                </div>`;

content = content.substring(0, sIdx) + newMapping + content.substring(eIdx);
fs.writeFileSync(path, content);
console.log('Successfully completed Rewrite 4!');
