"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ImageUploader({
  files,
  setFiles,
}: {
  files: File[];
  setFiles: (files: File[]) => void;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => setFiles([...files, ...accepted]),
    [files]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  function onDragEnd(result: any) {
    if (!result.destination) return;
    const reordered = Array.from(files);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setFiles(reordered);
  }

  return (
    <>
      <div
        {...getRootProps()}
        className="mb-4 flex h-24 items-center justify-center rounded border-2 border-dashed"
      >
        <input {...getInputProps()} />
        {isDragActive ? "Drop here..." : "Click or drag images"}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="imgs" direction="horizontal">
          {(prov) => (
            <div
              ref={prov.innerRef}
              {...prov.droppableProps}
              className="flex gap-2 overflow-x-auto"
            >
              {files.map((f, idx) => (
                <Draggable
                  draggableId={f.name + idx}
                  index={idx}
                  key={f.name + idx}
                >
                  {(p) => (
                    <img
                      ref={p.innerRef}
                      {...p.draggableProps}
                      {...p.dragHandleProps}
                      src={URL.createObjectURL(f)}
                      className="h-20 w-20 rounded object-cover"
                    />
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
}
