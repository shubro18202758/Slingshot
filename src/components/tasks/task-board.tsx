"use client";

import { useState, useEffect } from "react";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDb } from "@/components/providers/db-provider";
import { tasks, type Task } from "@/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { Calendar, CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
type Status = "todo" | "in-progress" | "done";

// --- Components ---

function TaskCard({ task, isOverlay }: { task: Task; isOverlay?: boolean }) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: "Task",
            task,
        },
    });

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    };

    const priorityColors = {
        low: "bg-blue-50 text-blue-700 border-blue-100",
        medium: "bg-yellow-50 text-yellow-700 border-yellow-100",
        high: "bg-red-50 text-red-700 border-red-100",
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30 p-4 border rounded-lg bg-slate-50 h-[120px]"
            />
        );
    }

    const priority = (task.priority as keyof typeof priorityColors) || "medium";

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing space-y-3",
                isOverlay ? "shadow-xl rotate-2 ring-2 ring-blue-500 ring-offset-2" : ""
            )}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-medium text-slate-900 leading-tight">{task.title}</h3>
                {/* Priority Badge */}
                <div className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border", priorityColors[priority])}>
                    {priority}
                </div>
            </div>

            {task.description && (
                <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                    {task.dueDate ? (
                        <>
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(task.dueDate), "MMM d")}</span>
                        </>
                    ) : (
                        <span className="opacity-50">No Date</span>
                    )}
                </div>
                {/* Status Indicator (Subtle) */}
                <div className={cn(
                    "h-2 w-2 rounded-full",
                    task.status === "done" ? "bg-green-500" :
                        task.status === "in-progress" ? "bg-blue-500" : "bg-slate-300"
                )} />
            </div>
        </div>
    );
}

function Column({ id, title, tasks }: { id: Status; title: string; tasks: Task[] }) {
    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: "Column",
            columnId: id,
        },
    });

    return (
        <div className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200/60 p-4 w-[350px] min-w-[350px]">
            <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                    "p-1.5 rounded-md",
                    id === "todo" ? "bg-slate-200 text-slate-700" :
                        id === "in-progress" ? "bg-blue-100 text-blue-700" :
                            "bg-green-100 text-green-700"
                )}>
                    {id === "todo" && <Circle className="h-4 w-4" />}
                    {id === "in-progress" && <Clock className="h-4 w-4" />}
                    {id === "done" && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <h2 className="font-semibold text-slate-700">{title}</h2>
                <span className="ml-auto text-xs font-mono bg-white px-2 py-1 rounded border text-slate-500">
                    {tasks.length}
                </span>
            </div>

            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className="flex-1 space-y-3 overflow-y-auto pr-2 min-h-[100px]">
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                    {tasks.length === 0 && (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                            Drop tasks here
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

export function TaskBoard({ tasks: initialTasks, onUpdate }: { tasks: Task[]; onUpdate?: () => void }) {
    // Only use DB for writes, consume read-state from parent or fetch internally?
    // Let's assume parent passes us the tasks for now, but we need to update DB.
    const { db } = useDb();
    const [localTasks, setLocalTasks] = useState(initialTasks);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Sync local state when props change
    useEffect(() => {
        setLocalTasks(initialTasks);
    }, [initialTasks]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // 5px drag to start
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === "Task") {
            setActiveTask(event.active.data.current.task);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = active.id as string;
        // const overId = over.id as string;

        const activeTask = localTasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        // If dropped over a column container
        const overData = over.data.current;
        let newStatus: Status | null = null;

        if (overData?.type === "Column") {
            newStatus = overData.columnId as Status;
        } else if (overData?.type === "Task") {
            // Dropped over another task, find its status
            newStatus = overData.task.status as Status;
        }

        if (newStatus && newStatus !== activeTask.status) {
            // Optimistic update
            setLocalTasks((prev) =>
                prev.map((t) => (t.id === activeId ? { ...t, status: newStatus! } : t))
            );

            // DB Update
            if (db) {
                await db
                    .update(tasks)
                    .set({ status: newStatus })
                    .where(eq(tasks.id, activeId));

                if (onUpdate) onUpdate();
            }
        }
    };

    return (
        <div className="h-full overflow-x-auto">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full gap-6 pb-4 min-w-max">
                    <Column id="todo" title="To Do" tasks={localTasks.filter((t) => t.status === "todo")} />
                    <Column id="in-progress" title="In Progress" tasks={localTasks.filter((t) => t.status === "in-progress")} />
                    <Column id="done" title="Done" tasks={localTasks.filter((t) => t.status === "done")} />
                </div>

                <DragOverlay>
                    {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
