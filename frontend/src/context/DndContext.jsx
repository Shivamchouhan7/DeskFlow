import { createContext, useContext, useRef, useState } from 'react';

const DndContext = createContext(null);

export function DndProvider({ children }) {
  const dragging = useRef(null); // { ticketId, fromStatus }
  const [dragOverCol, setDragOverCol] = useState(null);

  return (
    <DndContext.Provider value={{ dragging, dragOverCol, setDragOverCol }}>
      {children}
    </DndContext.Provider>
  );
}

export function useDnd() {
  return useContext(DndContext);
}
