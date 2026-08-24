"use client";

import React, { useState } from "react";
import {
  Check, BrainCircuit, ShieldCheck,
  User, HandHeart, Plus, Trash2, X, ChevronRight, Search, Phone,
  MapPin, CheckSquare, GripVertical
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useT } from "@/lib/i18n/I18nProvider";

// `labelKey` plutôt que `label` : ces constantes sont évaluées au chargement du
// module, avant que le provider i18n existe. Les libellés se résolvent au rendu,
// via nodeLabel() / nodeTooltip() plus bas.
export const NODE_TYPES = {
  welcome_message: { icon: User, labelKey: "dashboard.pipeline.nodes.welcome", color: "#3b82f6", time: 0 },
  qualifying_questions: { icon: ShieldCheck, labelKey: "dashboard.pipeline.nodes.qualifying", color: "#8b5cf6", time: 2 },
  // Bascule Experience : le scoring CV, les tests QCM humains et l'interview
  // vidéo one-way sont obsolètes → l'évaluation est portée par le bloc Expérience.
  experience: { icon: BrainCircuit, labelKey: "dashboard.pipeline.nodes.experience", color: "#f59e0b", time: 10 },
  thank_you_message: { icon: HandHeart, labelKey: "dashboard.pipeline.nodes.thanks", color: "#14b8a6", time: 0 },
};

export const LOCKED_NODE_TYPES = {
  sourcing:        { icon: Search,      labelKey: "dashboard.pipelineNodes.sourcing",        tooltipKey: "dashboard.pipeline.nodes.sourcingHelp" },
  entretien_visio: { icon: Phone,       labelKey: "dashboard.pipeline.nodes.videoCall",      tooltipKey: "dashboard.pipeline.nodes.videoCallHelp" },
  entretien_site:  { icon: MapPin,      labelKey: "dashboard.pipeline.nodes.onSite",         tooltipKey: "dashboard.pipeline.nodes.onSiteHelp" },
  debrief_finale:  { icon: CheckSquare, labelKey: "dashboard.pipeline.nodes.debrief",        tooltipKey: "dashboard.pipeline.nodes.debriefHelp" },
};

/** Libellé traduit d'un type d'étape, verrouillé ou non. */
export const nodeLabel = (t, type) => {
  const def = NODE_TYPES[type] || LOCKED_NODE_TYPES[type];
  return def ? t(def.labelKey) : type;
};

function SortableNodeCard({ 
  node, isLast, isSelected, isHovered, 
  isEditable, isDeletable,
  onSelect, onHover, onHoverEnd, onDelete 
}) {
  const t = useT();
  const isLocked = node.locked;
  
  // dnd-kit setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: node.id, 
    disabled: isLocked || !isEditable || !isDeletable // don't drag locked, uneditable, or fixed ones (accueil/remerciements)
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 99 : 1,
    display: 'flex', 
    alignItems: 'center', 
    flexShrink: 0
  };

  // Determine label & subtitle
  let label = '';
  let subtitle = '';

  if (isLocked) {
    const lockedMeta = LOCKED_NODE_TYPES[node.type];
    if (!lockedMeta) return null;
    label = t(lockedMeta.labelKey);
    subtitle = t("dashboard.pipeline.customStep");
  } else {
    const meta = NODE_TYPES[node.type];
    if (!meta) return null;

    if (node.type === 'experience') {
      label = t("dashboard.pipeline.nodes.experience");
      subtitle = t("dashboard.pipeline.clickToConfigure");
    } else if (node.type === 'qualifying_questions') {
      label = t("dashboard.pipeline.nodes.qualifying");
      subtitle = `${node.config?.questions?.length || 0} questions`;
    } else if (node.type === 'welcome_message') {
      label = t("dashboard.pipeline.nodes.welcome");
      subtitle = t("dashboard.pipeline.clickToEdit");
    } else if (node.type === 'thank_you_message') {
      label = t("dashboard.pipeline.nodes.thanks");
      subtitle = t("dashboard.pipeline.clickToEdit");
    } else {
      label = t(meta.labelKey);
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => { 
          // Prevent click when dragging
          if (e.defaultPrevented) return;
          if (!isLocked && isEditable) onSelect(node.id); 
        }}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHoverEnd(node.id)}
        style={{
          minWidth: '170px',
          maxWidth: '220px',
          padding: '16px 20px',
          border: `1px solid ${isSelected ? 'var(--foreground)' : isLocked ? '#e8e8e8' : 'var(--border)'}`,
          borderRadius: '8px',
          background: isLocked ? '#fafafa' : 'white',
          cursor: isLocked || !isEditable ? 'default' : (!isDeletable ? 'pointer' : 'grab'),
          transition: 'all 150ms',
          opacity: isLocked ? 0.7 : 1,
          boxShadow: isSelected ? '0 0 0 1px var(--foreground)' : (isDragging ? '0 12px 24px rgba(0,0,0,0.1)' : 'none'),
          position: 'relative',
        }}
      >
        {/* Small X button on hover to delete */}
        {isHovered && isDeletable && isEditable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(t("dashboard.pipeline.deleteStepConfirm"))) {
                onDelete(e, node.id);
              }
            }}
            style={{
              position: 'absolute', top: '-8px', right: '-8px',
              background: 'white', color: 'var(--muted-foreground)', 
              border: '1px solid var(--border)', cursor: 'pointer',
              width: '20px', height: '20px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'all 150ms ease',
              zIndex: 10
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--destructive)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = 'var(--destructive)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = 'var(--muted-foreground)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            title={t("dashboard.pipeline.deleteStep")}
          >
            <X size={12} />
          </button>
        )}
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '16px' }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </div>
        )}
      </div>
      {!isLast && (
        <ChevronRight size={18} style={{ color: 'var(--muted-foreground)', flexShrink: 0, margin: '0 8px' }} />
      )}
    </div>
  );
}

export default function PipelineVisualEditor({
  nodes,
  isEditable = true,
  selectedNodeId,
  onNodeClick,
  onAssessmentClick,
  onAddNode,
  onDeleteNode,
  onNodesChange,
  headerActions
}) {
  const t = useT();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = nodes.findIndex((i) => i.id === active.id);
      const newIndex = nodes.findIndex((i) => i.id === over.id);

      // Can't drag locked nodes or drag into locked positions
      if (nodes[oldIndex]?.locked || nodes[newIndex]?.locked) return;
      // Can't drag to first or last positions (locked sourcing / debrief)
      if (newIndex === 0 || newIndex === nodes.length - 1) return;

      const qualifIndex = nodes.findIndex(n => n.type === 'qualifying_questions');
      if (qualifIndex !== -1 && newIndex <= qualifIndex && active.id !== nodes[qualifIndex].id) return;
      
      const newNodes = arrayMove(nodes, oldIndex, newIndex);
      if (onNodesChange) {
        onNodesChange(newNodes);
      }
    }
  };

  const handleNodeClick = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'assessment' && onAssessmentClick) {
      onAssessmentClick(nodeId);
    } else if (onNodeClick) {
      onNodeClick(nodeId);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: '8px',
      padding: '24px', background: 'white',
      maxWidth: '100%'
    }}>
      {/* Pipeline header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--foreground)', margin: 0 }}>{t("dashboard.pipeline.title")}</h3>
          {headerActions}
        </div>
        {isEditable && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="btn btn-outline"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <Plus size={14} /> {t("dashboard.pipeline.addStep")}
            </button>
            {showAddMenu && (
              <div className="fade-in" style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'white', border: '1px solid var(--border)', borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', width: '240px', overflow: 'hidden', zIndex: 20
              }}>
                <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  {t("dashboard.pipeline.addStep")}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {Object.entries(NODE_TYPES).filter(([k]) => !['welcome_message', 'thank_you_message'].includes(k)).map(([type, meta]) => {
                    const isUnique = type === 'qualifying_questions' || type === 'experience';
                    const exists = isUnique ? nodes.some(n => n.type === type) : false;
                    const Icon = meta.icon;
                    return (
                      <button 
                        key={type} 
                        onClick={() => { 
                          if (!exists) {
                            onAddNode(type);
                            setShowAddMenu(false);
                          }
                        }} 
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: exists ? 'not-allowed' : 'pointer', opacity: exists ? 0.4 : 1, textAlign: 'left', width: '100%' }}
                      >
                        <Icon size={16} color={meta.color} />
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--foreground)' }}>{t(meta.labelKey)}</span>
                        {exists && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pipeline steps — drag and drop context */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px 0', flexWrap: 'wrap', paddingBottom: '8px' }}>
          <SortableContext 
            items={nodes.map(n => n.id)} 
            strategy={rectSortingStrategy}
          >
            {nodes.map((node, index) => {
              const isLast = index === nodes.length - 1;
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isDeletable = node.type !== 'accueil' && node.type !== 'remerciements';

              return (
                <SortableNodeCard
                  key={node.id}
                  node={node}
                  isLast={isLast}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  isEditable={isEditable}
                  isDeletable={isDeletable}
                  onSelect={handleNodeClick}
                  onHover={setHoveredNodeId}
                  onHoverEnd={() => setHoveredNodeId(null)}
                  onDelete={onDeleteNode}
                />
              );
            })}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}
