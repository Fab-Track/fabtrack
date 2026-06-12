import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { CheckCircle2, GripVertical } from "lucide-react";
import DesignQueueItem from "./DesignQueueItem";
import { applyPriority } from "./useDesignPriority";

/**
 * A draggable priority queue for design work.
 * @param {string} title - Queue heading
 * @param {Job[]} jobs - All jobs for this queue (unsorted)
 * @param {string[]} storedOrder - Persisted manual order (array of job IDs)
 * @param {(ids: string[]) => void} onOrderChange - Callback to persist new order
 * @param {string} emptyMessage - Text shown when queue is empty
 */
export default function DesignQueue({ title, jobs, storedOrder, onOrderChange, emptyMessage }) {
  const { sorted: initialSorted, manualIds } = applyPriority(jobs, storedOrder);
  const [items, setItems] = useState(initialSorted);
  const [manualSet, setManualSet] = useState(new Set(manualIds));

  // Re-sync when upstream jobs change (e.g. refetch)
  useEffect(() => {
    const { sorted, manualIds: newManual } = applyPriority(jobs, storedOrder);
    setItems(sorted);
    setManualSet(new Set(newManual));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.map(j => j.id).join(","), storedOrder.join(",")]);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [moved] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, moved);
    setItems(newItems);
    const newOrder = newItems.map(j => j.id);
    setManualSet(new Set(newOrder));
    onOrderChange(newOrder);
  }, [items, onOrderChange]);

  if (jobs.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3">{title}</h3>
        <div className="text-center py-6">
          <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{items.length} job{items.length !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            <GripVertical className="w-2.5 h-2.5" /> drag to reorder
          </span>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={title}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {items.map((job, index) => (
                <Draggable key={job.id} draggableId={job.id} index={index}>
                  {(prov, snapshot) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                    >
                      <DesignQueueItem
                        job={job}
                        isManual={manualSet.has(job.id)}
                        dragHandleProps={prov.dragHandleProps}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}