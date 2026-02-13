
"use client";

import { useState } from "react";
import {
    format,
    subMonths,
    addMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    eachDayOfInterval,
    parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Event } from "@/db/schema";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";


import { useEffect } from "react";

interface CalendarViewProps {
    events: Event[];
    focusedDate?: Date;
}

export function CalendarView({ events, focusedDate }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Update calendar view when focusedDate changes (e.g. from date picker)
    useEffect(() => {
        if (focusedDate) {
            setCurrentMonth(focusedDate);
            setSelectedDate(focusedDate);
        }
    }, [focusedDate]);

    const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const onToday = () => {
        const now = new Date();
        setCurrentMonth(now);
        setSelectedDate(now);
    }

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">
                        {format(currentMonth, "MMMM yyyy")}
                    </h2>
                    <Button variant="outline" size="sm" onClick={onToday} className="h-7 text-xs border-white/10 hover:bg-white/5">
                        Today
                    </Button>
                </div>
                <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={onPrevMonth} className="hover:bg-white/10">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onNextMonth} className="hover:bg-white/10">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const dateFormat = "eeee";
        const startDate = startOfWeek(currentMonth);

        for (let i = 0; i < 7; i++) {
            days.push(
                <div className="text-center text-sm font-medium text-muted-foreground py-2 uppercase tracking-wider" key={i}>
                    {format(startDate, dateFormat)}
                </div>
            );
            startDate.setDate(startDate.getDate() + 1);
        }

        return <div className="grid grid-cols-7 mb-2 border-b border-white/10">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                // Find events for this day
                const dayEvents = events.filter((event) => {
                    if (!event.eventDate) return false;
                    // Handle both Date objects and string/ISO dates if they come from JSON
                    const eDate = event.eventDate instanceof Date ? event.eventDate : new Date(event.eventDate);
                    return isSameDay(eDate, cloneDay);
                });

                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, monthStart);

                days.push(
                    <div
                        className={cn(
                            "min-h-[120px] p-2 border border-white/5 relative group transition-colors hover:bg-white/5 flex flex-col gap-1",
                            !isCurrentMonth && "opacity-30 bg-black/20",
                            isToday && "bg-cyan-950/10 border-cyan-500/30"
                        )}
                        key={day.toString()}
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <div className="flex justify-between items-start">
                            <span className={cn(
                                "text-sm font-semibold h-7 w-7 flex items-center justify-center rounded-full",
                                isToday ? "bg-cyan-500 text-black" : "text-muted-foreground group-hover:text-white"
                            )}>
                                {formattedDate}
                            </span>
                            {dayEvents.length > 0 && (
                                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-900/30 px-1.5 rounded-sm">
                                    {dayEvents.length}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[80px] no-scrollbar">
                            {dayEvents.map((event) => (
                                <Popover key={event.id}>
                                    <PopoverTrigger asChild>
                                        <div className="text-[10px] truncate bg-zinc-800/80 p-1 rounded border border-white/5 cursor-pointer hover:border-cyan-500/50 hover:bg-zinc-800 transition-all text-left">
                                            <div className="font-medium text-white/90 truncate">{event.title}</div>
                                            <div className="text-xs text-muted-foreground truncate">{format(new Date(event.eventDate!), "h:mm a")}</div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 bg-zinc-950 border-white/10 p-4 shadow-2xl backdrop-blur-xl">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-bold text-lg text-white leading-tight">{event.title}</h4>
                                                <Badge variant="outline" className={cn(
                                                    "capitalize text-[10px]",
                                                    event.source === 'WhatsApp' ? 'border-green-500/50 text-green-400' : 'border-blue-500/50 text-blue-400'
                                                )}>
                                                    {event.source}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-cyan-400">
                                                <CalendarIcon className="h-4 w-4" />
                                                <span>{format(new Date(event.eventDate!), "PPPP")}</span>
                                                <Clock className="h-4 w-4 ml-2" />
                                                <span>{format(new Date(event.eventDate!), "p")}</span>
                                            </div>

                                            {event.metadata && (event.metadata as any).location && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <MapPin className="h-4 w-4" />
                                                    <span>{(event.metadata as any).location}</span>
                                                </div>
                                            )}

                                            <p className="text-sm text-muted-foreground bg-white/5 p-2 rounded-md border border-white/5">
                                                {event.description}
                                            </p>

                                            {event.url && (
                                                <a
                                                    href={event.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-cyan-400 hover:underline break-all"
                                                >
                                                    {event.url}
                                                </a>
                                            )}

                                            <div className="text-[10px] text-zinc-600 mt-2 font-mono">
                                                RAW: {event.rawContext.substring(0, 100)}...
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ))}
                        </div>
                    </div>
                );
                day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="bg-black/20 rounded-xl border border-white/10 overflow-hidden">{rows}</div>;
    };

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
}
