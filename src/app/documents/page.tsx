"use client";

import { useEffect, useState } from "react";
import { Plus, File, Trash2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDb } from "@/components/providers/db-provider";
import { documents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { TemplatePicker } from "@/components/editor/template-picker";

export default function DocumentsPage() {
  const { db, workspaceId } = useDb();
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const fetchDocs = async () => {
    if (!db) return;
    const res = await db.select().from(documents).orderBy(desc(documents.createdAt));
    setDocs(res);
  };

  useEffect(() => {
    fetchDocs();
  }, [db]);

  const handleCreate = async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const newId = uuidv4();
      await db.insert(documents).values({
        id: newId,
        workspaceId: workspaceId,
        title: "Untitled Document",
        content: "<p>Start writing...</p>",
      });
      router.push(`/documents/${newId}`);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db) return;
    if (confirm("Are you sure you want to delete this document?")) {
      await db.delete(documents).where(eq(documents.id, id));
      fetchDocs();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Documents
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your notes, research, and drafts.
            </p>
          </div>
          <Button
            onClick={() => setShowTemplatePicker(true)}
            className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-105"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </div>

        {/* Template Picker */}
        <TemplatePicker isOpen={showTemplatePicker} onClose={() => setShowTemplatePicker(false)} />

        {/* Document Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {docs.map((doc, i) => (
            <Card
              key={doc.id}
              className="group cursor-pointer border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1"
              onClick={() => router.push(`/documents/${doc.id}`)}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 p-2.5 rounded-lg border border-purple-500/10">
                  <File className="h-5 w-5 text-purple-400" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  onClick={(e) => handleDelete(doc.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                <CardTitle className="text-lg truncate">{doc.title}</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {new Date(doc.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </CardDescription>
              </CardContent>
            </Card>
          ))}

          {docs.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-6 rounded-2xl border border-purple-500/10 mb-4">
                <Sparkles className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/80">No documents yet</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                Create your first document to start building your knowledge workspace.
              </p>
              <Button
                onClick={handleCreate}
                className="mt-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Document
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
