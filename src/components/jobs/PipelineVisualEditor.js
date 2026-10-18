"use client";

import React, { useState } from "react";
import {
  Check, BrainCircuit, ShieldCheck,
  Plus, Trash2, X, ChevronRight, Search, Phone,
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
  qualifying_questions: { icon: ShieldCheck, labelKey: "dashboard.pipeline.nodes.qualifying", color: "#8b5cf6", time: 2 },
  // Bascule Experience : le scoring CV, les tests QCM humains et l'interview
  // vidéo one-way sont obsolètes → l'évaluation est portée par le bloc Expérience.
  experience: { icon: BrainCircuit, labelKey: "dashboard.pipeline.nodes.experience", color: "#f59e0b", time: 10 },
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
      // La carte annonçait « cliquez pour configurer » même sur une expérience
      // déjà générée : elle invitait à refaire ce qui était fait, et ne disait
      // rien de ce qu'elle contenait. Elle décrit maintenant son état, comme la
      // carte voisine annonce son nombre de questions.
      const exp = node.config?.experience;
      if (!exp) {
        subtitle = t("dashboard.pipeline.nodes.experienceEmpty");
      } else if (exp.statut === "published") {
        // Publiée : ce que le candidat va rencontrer, et le temps qu'on lui prend.
        subtitle = t("dashboard.pipeline.nodes.experienceReady", {
          count: exp.nbEtapes,
          minutes: exp.minutes || 0,
        });
      } else {
        // Brouillon : rien n'est visible côté candidat tant qu'on n'a pas publié.
        // C'est l'information la plus utile ici, avant la durée.
        subtitle = t("dashboard.pipeline.nodes.experienceDraft", { count: exp.nbEtapes });
      }
    } else if (node.type === 'qualifying_questions') {
      label = t("dashboard.pipeline.nodes.qualifying");
      subtitle = t("dashboard.pipeline.nodes.qualifyingCount", {
        count: node.config?.questions?.length || 0,
      });
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
          padding: '14px 16px',
          border: `1px solid ${isSelected ? 'var(--ds-blue)' : isLocked ? 'var(--ds-line-inset)' : 'var(--ds-line)'}`,
          borderRadius: '12px',
          background: isLocked ? 'var(--ds-soft)' : 'white',
          cursor: isLocked || !isEditable ? 'default' : (!isDeletable ? 'pointer' : 'grab'),
          transition: 'all 150ms',
          opacity: isLocked ? 0.7 : 1,
          boxShadow: isSelected ? '0 0 0 3px var(--ds-blue-10)' : (isDragging ? 'var(--ds-shadow-pop)' : 'var(--ds-shadow-xs)'),
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
        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ds-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '16px' }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: '12px', color: 'var(--ds-ink-4)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </div>
        )}
      </div>
      {!isLast && (
        <ChevronRight size={18} style={{ color: 'var(--ds-ink-6)', flexShrink: 0, margin: '0 8px' }} />
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
    <div className="ds-card" style={{ padding: '18px 20px', maxWidth: '100%' }}>
      {/* Pipeline header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 className="ds-h2">{t("dashboard.pipeline.title")}</h3>
          {headerActions}
        </div>
        {isEditable && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="ds-btn ds-btn-sm"
            >
              <Plus size={14} /> {t("dashboard.pipeline.addStep")}
            </button>
            {showAddMenu && (
              <div className="ds-menu fade-in" style={{ top: 'calc(100% + 6px)', right: 0, width: 240 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {Object.entries(NODE_TYPES).map(([type, meta]) => {
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
                        className="ds-menu-item"
                        style={{ cursor: exists ? 'not-allowed' : 'pointer', opacity: exists ? 0.45 : 1 }}
                      >
                        <Icon size={15} color="var(--ds-blue)" />
                        <span>{t(meta.labelKey)}</span>
                        {exists && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--ds-blue)' }} />}
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
