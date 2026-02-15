"use client";

import { useState, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    Position,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, Zap, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { type RoadmapGraph } from '@/lib/ai/roadmap-architect';
import { saveRoadmap, getRoadmaps } from '@/app/actions/roadmap-actions';
import { getLearningProfile } from '@/app/actions/profile-actions'; // Needed for context
import { GapAnalysisPanel } from './gap-analysis-panel';

// Custom Node Component (Optional, but let's stick to default for MVP to keep it simple)

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export function RoadmapRenderer() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [domain, setDomain] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [summary, setSummary] = useState("");

    const handleGenerate = async () => {
        if (!domain.trim()) return;
        setIsGenerating(true);
        setNodes([]);
        setEdges([]);
        setSummary("");

        try {
            toast.info("🧠 Analyzing Learning DNA...");
            const profile = await getLearningProfile();

            toast.info(`🏗️ Architecting Roadmap for: ${domain}...`);
            // Dynamic import or just calling the logic. 
            // We need to import the AI logic here.
            // Since `roadmap-architect.ts` imports LLMEngine which is client-side, we can import it here.

            // NOTE: We need to make sure `roadmap-architect.ts` is client-safe.
            // It imports `LLMEngine`. 
            const architect = await import("@/lib/ai/roadmap-architect");

            const graph: RoadmapGraph = await architect.generateRoadmap(profile || {}, domain);

            if (graph && graph.nodes) {
                // Compute tree layout using topological depth from edges
                const depthMap = new Map<string, number>();
                const childrenMap = new Map<string, string[]>();
                const parentSet = new Set<string>();

                for (const edge of graph.edges) {
                    if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
                    childrenMap.get(edge.source)!.push(edge.target);
                    parentSet.add(edge.target);
                }

                // Find root nodes (no incoming edges)
                const roots = graph.nodes.filter(n => !parentSet.has(n.id)).map(n => n.id);
                if (roots.length === 0 && graph.nodes.length > 0) roots.push(graph.nodes[0].id);

                // BFS to assign depths
                const queue = roots.map(r => ({ id: r, depth: 0 }));
                const visited = new Set<string>();
                while (queue.length > 0) {
                    const { id, depth } = queue.shift()!;
                    if (visited.has(id)) continue;
                    visited.add(id);
                    depthMap.set(id, depth);
                    for (const child of childrenMap.get(id) ?? []) {
                        if (!visited.has(child)) {
                            queue.push({ id: child, depth: depth + 1 });
                        }
                    }
                }
                // Assign depth 0 to any unvisited nodes
                for (const node of graph.nodes) {
                    if (!depthMap.has(node.id)) depthMap.set(node.id, 0);
                }

                // Group nodes by depth for horizontal spread
                const depthGroups = new Map<number, string[]>();
                for (const [id, depth] of depthMap) {
                    if (!depthGroups.has(depth)) depthGroups.set(depth, []);
                    depthGroups.get(depth)!.push(id);
                }

                const NODE_WIDTH = 200;
                const NODE_HEIGHT = 120;
                const X_GAP = 60;
                const Y_GAP = 40;

                const layoutedNodes = graph.nodes.map((node) => {
                    const depth = depthMap.get(node.id) ?? 0;
                    const siblings = depthGroups.get(depth) ?? [node.id];
                    const sibIndex = siblings.indexOf(node.id);
                    const totalWidth = siblings.length * (NODE_WIDTH + X_GAP) - X_GAP;
                    const startX = -(totalWidth / 2) + 400; // center around x=400

                    return {
                        id: node.id,
                        data: {
                            label: node.label,
                            description: node.description,
                            status: node.status,
                            nodeType: node.type,
                        },
                        position: {
                            x: startX + sibIndex * (NODE_WIDTH + X_GAP),
                            y: depth * (NODE_HEIGHT + Y_GAP),
                        },
                        type: 'default',
                        style: {
                            background: node.status === 'completed' ? '#0f522e' :
                                node.status === 'next' ? '#78350f' :
                                    node.status === 'locked' ? '#3f3f46' : '#1e293b',
                            color: '#fff',
                            border: node.status === 'next' ? '1px solid #f59e0b' : '1px solid #333',
                            borderRadius: '8px',
                            padding: '10px',
                            width: NODE_WIDTH,
                            fontSize: '12px'
                        }
                    };
                });

                const layoutedEdges = graph.edges.map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    animated: true,
                    style: { stroke: '#475569' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
                }));

                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
                setSummary(graph.summary);

                toast.success("Roadmap Generated!");

                // Save to DB
                await saveRoadmap(domain, graph);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to generate roadmap.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex gap-4 h-[600px]">
            <Card className="bg-black/40 border-purple-500/20 flex-1 flex flex-col backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <LayoutDashboard className="h-5 w-5 text-purple-400" />
                            Career Architect
                        </CardTitle>
                        <CardDescription>Generate a personalized learning path.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Target Domain (e.g. LLM Ops)"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="w-64 bg-black/50 border-purple-500/30 text-purple-100 placeholder:text-purple-500/50"
                        />
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                            Generate
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 w-full h-full relative p-0 overflow-hidden rounded-b-xl">
                    {nodes.length > 0 ? (
                        <>
                            <div className="absolute top-4 right-4 z-10 bg-black/80 p-4 rounded-lg border border-white/10 max-w-xs text-sm text-muted-foreground backdrop-blur-md">
                                <h4 className="font-semibold text-white mb-2">Architect's Summary</h4>
                                <p>{summary}</p>
                            </div>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                fitView
                            >
                                <Background color="#333" gap={20} />
                                <Controls />
                            </ReactFlow>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                                <p>Enter a domain to generate your roadmap.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Gap Analysis Sidebar */}
            {nodes.length > 0 && (
                <GapAnalysisPanel
                    graph={{
                        nodes: nodes.map(n => ({
                            id: n.id,
                            label: n.data.label as string,
                            description: (n.data.description as string) || "",
                            status: (n.data.status as "completed" | "in-progress" | "next" | "locked") || "next",
                            type: (n.data.nodeType as "concept" | "project" | "milestone") || "concept",
                        })),
                        edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
                        summary,
                        estimated_duration: ""
                    }}
                />
            )}
        </div>
    );
}
