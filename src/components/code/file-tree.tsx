"use client";

import { useMemo, useState } from "react";
import { ChevronRight, File, Folder, FolderOpen, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface TreeNode {
  type: "dir" | "file";
  name: string;
  path: string;
  children?: TreeNode[];
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { type: "dir", name: "", path: "", children: [] };
  for (const p of paths) {
    const parts = p.split("/");
    let node = root;
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      acc = acc ? `${acc}/${name}` : name;
      const isLeaf = i === parts.length - 1;
      let next = node.children!.find((c) => c.name === name);
      if (!next) {
        next = { type: isLeaf ? "file" : "dir", name, path: acc, children: isLeaf ? undefined : [] };
        node.children!.push(next);
      }
      node = next;
    }
  }
  const sortRecursive = (n: TreeNode) => {
    if (!n.children) return;
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sortRecursive);
  };
  sortRecursive(root);
  return root;
}

interface Props {
  workspaceId: string;
  activePath: string | null;
  onOpen: (path: string) => void;
}

export function FileTree({ workspaceId, activePath, onOpen }: Props) {
  const ws = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const writeFile = useWorkspaceStore((s) => s.writeFile);
  const deleteFile = useWorkspaceStore((s) => s.deleteFile);
  const renameFile = useWorkspaceStore((s) => s.renameFile);

  const tree = useMemo(() => (ws ? buildTree(ws.files.map((f) => f.path)) : null), [ws]);
  const [creatingAt, setCreatingAt] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameBuf, setRenameBuf] = useState("");

  if (!ws || !tree) return <div className="p-4 text-xs text-muted-foreground">No workspace.</div>;

  function commitCreate() {
    if (!ws || !creatingAt) return;
    const name = newName.trim();
    if (!name) { setCreatingAt(null); return; }
    const path = creatingAt ? `${creatingAt}/${name}`.replace(/^\//, "") : name;
    if (ws.files.some((f) => f.path === path)) {
      toast.error("File already exists");
      return;
    }
    writeFile(ws.id, path, "");
    onOpen(path);
    setCreatingAt(null);
    setNewName("");
  }

  function commitRename(oldPath: string) {
    const next = renameBuf.trim();
    if (!next || next === oldPath) { setRenamingPath(null); return; }
    if (ws!.files.some((f) => f.path === next)) {
      toast.error("Path already exists");
      return;
    }
    renameFile(ws!.id, oldPath, next);
    setRenamingPath(null);
  }

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Files</span>
        <button
          onClick={() => { setCreatingAt(""); setNewName(""); }}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          title="New file at root"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="py-1">
        {creatingAt === "" && (
          <div className="px-3 py-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") setCreatingAt(null); }}
              onBlur={commitCreate}
              placeholder="newfile.ts"
              className="w-full text-xs px-1 py-0.5 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
        <Subtree
          node={tree}
          depth={0}
          activePath={activePath}
          onOpen={onOpen}
          onDelete={(p) => { if (confirm(`Delete ${p}?`)) { deleteFile(ws.id, p); toast.success("Deleted"); } }}
          onStartRename={(p) => { setRenamingPath(p); setRenameBuf(p); }}
          renamingPath={renamingPath}
          renameBuf={renameBuf}
          setRenameBuf={setRenameBuf}
          onCommitRename={commitRename}
          onCancelRename={() => setRenamingPath(null)}
        />
      </div>
    </div>
  );
}

interface SubtreeProps {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  renamingPath: string | null;
  renameBuf: string;
  setRenameBuf: (v: string) => void;
  onOpen: (path: string) => void;
  onDelete: (path: string) => void;
  onStartRename: (path: string) => void;
  onCommitRename: (oldPath: string) => void;
  onCancelRename: () => void;
}

function Subtree({ node, depth, activePath, renamingPath, renameBuf, setRenameBuf, onOpen, onDelete, onStartRename, onCommitRename, onCancelRename }: SubtreeProps) {
  return (
    <ul>
      {(node.children ?? []).map((child) =>
        child.type === "dir" ? (
          <DirNode key={child.path} node={child} depth={depth} activePath={activePath} renamingPath={renamingPath} renameBuf={renameBuf} setRenameBuf={setRenameBuf} onOpen={onOpen} onDelete={onDelete} onStartRename={onStartRename} onCommitRename={onCommitRename} onCancelRename={onCancelRename} />
        ) : (
          <FileNode key={child.path} node={child} depth={depth} active={activePath === child.path} renamingPath={renamingPath} renameBuf={renameBuf} setRenameBuf={setRenameBuf} onOpen={onOpen} onDelete={onDelete} onStartRename={onStartRename} onCommitRename={onCommitRename} onCancelRename={onCancelRename} />
        ),
      )}
    </ul>
  );
}

function DirNode(p: SubtreeProps) {
  const [open, setOpen] = useState(true);
  return (
    <li>
      <div className="group flex items-center gap-1 px-2 py-0.5 hover:bg-accent cursor-pointer rounded" style={{ paddingLeft: `${p.depth * 12 + 8}px` }} onClick={() => setOpen((v) => !v)}>
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
        {open ? <FolderOpen className="h-3 w-3 text-amber-500" /> : <Folder className="h-3 w-3 text-amber-500" />}
        <span className="truncate">{p.node.name}</span>
      </div>
      {open && <Subtree {...p} node={p.node} depth={p.depth + 1} />}
    </li>
  );
}

type FileNodeProps = Omit<SubtreeProps, "node" | "depth" | "activePath"> & { node: TreeNode; depth: number; active: boolean };
function FileNode({ node, depth, active, renamingPath, renameBuf, setRenameBuf, onOpen, onDelete, onStartRename, onCommitRename, onCancelRename }: FileNodeProps) {
  const isRenaming = renamingPath === node.path;
  return (
    <li>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-llmatlas-file", node.path);
          e.dataTransfer.effectAllowed = "copy";
        }}
        className={cn("group flex items-center gap-1 px-2 py-0.5 hover:bg-accent cursor-pointer rounded", active && "bg-accent")}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="w-3" />
        <File className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        {isRenaming ? (
          <input
            autoFocus
            value={renameBuf}
            onChange={(e) => setRenameBuf(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onCommitRename(node.path); if (e.key === "Escape") onCancelRename(); }}
            onBlur={() => onCommitRename(node.path)}
            className="flex-1 text-xs px-1 py-0 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        ) : (
          <span onClick={() => onOpen(node.path)} className="flex-1 truncate">{node.name}</span>
        )}
        <div className="hidden group-hover:flex gap-0.5">
          <button onClick={() => onStartRename(node.path)} className="p-0.5 rounded hover:bg-background/60" title="Rename">
            <Pencil className="h-2.5 w-2.5" />
          </button>
          <button onClick={() => onDelete(node.path)} className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive" title="Delete">
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
